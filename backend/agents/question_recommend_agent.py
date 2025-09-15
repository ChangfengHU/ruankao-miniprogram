"""
题目推荐Agent - 基于用户画像的智能推荐系统
"""
import asyncio
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
import structlog
from autogen import AssistantAgent

from core.config import settings
from models.question import Question, QuestionDifficulty, QuestionType
from models.user_profile import UserProfile, LearningPreference
from services.database_service import DatabaseService
from services.vector_service import VectorService
from utils.recommendation_algorithms import (
    CollaborativeFilteringRecommender,
    ContentBasedRecommender,
    HybridRecommender
)


logger = structlog.get_logger(__name__)


@dataclass
class RecommendationRequest:
    """推荐请求数据结构"""
    user_id: str
    num_questions: int = 10
    difficulty_preference: Optional[QuestionDifficulty] = None
    subject_filter: Optional[List[str]] = None
    exclude_answered: bool = True
    prioritize_weak_points: bool = True


@dataclass
class QuestionRecommendation:
    """题目推荐结果"""
    question_id: str
    question: Question
    score: float
    reason: str
    confidence: float
    recommendation_type: str  # "collaborative", "content", "knowledge_graph", "hybrid"


class QuestionRecommendAgent(AssistantAgent):
    """
    题目推荐Agent
    
    使用多种推荐算法为用户智能推荐最适合的学习题目
    """
    
    def __init__(self, name: str, system_message: str, llm_config: Dict):
        super().__init__(name=name, system_message=system_message, llm_config=llm_config)
        
        self.db_service = DatabaseService()
        self.vector_service = VectorService()
        
        # 推荐算法组件
        self.collaborative_recommender = CollaborativeFilteringRecommender()
        self.content_recommender = ContentBasedRecommender()
        self.hybrid_recommender = HybridRecommender()
        
        # 推荐缓存
        self.recommendation_cache: Dict[str, List[QuestionRecommendation]] = {}
        self.cache_ttl = timedelta(hours=1)
        self.last_cache_update: Dict[str, datetime] = {}
        
        # 推荐权重配置
        self.algorithm_weights = {
            "collaborative": 0.3,
            "content_based": 0.3,
            "knowledge_graph": 0.25,
            "user_preference": 0.15
        }
    
    async def recommend_questions(
        self, 
        user_id: str, 
        num_questions: int = 10,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[QuestionRecommendation]:
        """
        为用户推荐题目
        
        Args:
            user_id: 用户ID
            num_questions: 推荐题目数量
            filters: 过滤条件
            
        Returns:
            推荐题目列表
        """
        try:
            logger.info(f"🎯 开始为用户 {user_id} 推荐 {num_questions} 道题目")
            
            # 检查缓存
            cached_recommendations = await self._get_cached_recommendations(user_id)
            if cached_recommendations and len(cached_recommendations) >= num_questions:
                logger.info(f"📋 使用缓存推荐结果")
                return cached_recommendations[:num_questions]
            
            # 构建推荐请求
            request = RecommendationRequest(
                user_id=user_id,
                num_questions=num_questions,
                **filters if filters else {}
            )
            
            # 获取用户画像
            user_profile = await self._get_user_profile(user_id)
            if not user_profile:
                # 新用户使用默认推荐策略
                return await self._recommend_for_new_user(request)
            
            # 多算法并行推荐
            recommendations = await self._generate_hybrid_recommendations(request, user_profile)
            
            # 后处理：去重、排序、多样性优化
            final_recommendations = await self._post_process_recommendations(
                recommendations, request, user_profile
            )
            
            # 更新缓存
            await self._update_recommendation_cache(user_id, final_recommendations)
            
            # 记录推荐日志
            await self._log_recommendation_event(user_id, final_recommendations)
            
            logger.info(f"✅ 推荐完成，返回 {len(final_recommendations)} 道题目")
            
            return final_recommendations[:num_questions]
            
        except Exception as e:
            logger.error(f"❌ 题目推荐失败: {e}", exc_info=True)
            # 降级处理：返回热门题目
            return await self._fallback_recommendation(user_id, num_questions)
    
    async def _get_user_profile(self, user_id: str) -> Optional[UserProfile]:
        """获取用户画像"""
        try:
            query = """
            SELECT * FROM user_profiles 
            WHERE user_id = $1 
            ORDER BY updated_at DESC 
            LIMIT 1
            """
            
            result = await self.db_service.fetch_one(query, user_id)
            
            if result:
                return UserProfile.from_db_record(result)
                
            return None
            
        except Exception as e:
            logger.error(f"获取用户画像失败: {e}")
            return None
    
    async def _generate_hybrid_recommendations(
        self, 
        request: RecommendationRequest,
        user_profile: UserProfile
    ) -> List[QuestionRecommendation]:
        """生成混合推荐结果"""
        
        # 并行执行多种推荐算法
        collaborative_task = self._collaborative_filtering_recommend(request, user_profile)
        content_task = self._content_based_recommend(request, user_profile)
        knowledge_graph_task = self._knowledge_graph_recommend(request, user_profile)
        preference_task = self._user_preference_recommend(request, user_profile)
        
        # 等待所有算法完成
        results = await asyncio.gather(
            collaborative_task,
            content_task, 
            knowledge_graph_task,
            preference_task,
            return_exceptions=True
        )
        
        # 整合推荐结果
        all_recommendations = []
        algorithm_names = ["collaborative", "content_based", "knowledge_graph", "user_preference"]
        
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.warning(f"{algorithm_names[i]} 推荐算法失败: {result}")
                continue
            
            if result:
                all_recommendations.extend(result)
        
        return all_recommendations
    
    async def _collaborative_filtering_recommend(
        self, 
        request: RecommendationRequest,
        user_profile: UserProfile
    ) -> List[QuestionRecommendation]:
        """协同过滤推荐"""
        try:
            # 获取相似用户
            similar_users = await self._find_similar_users(request.user_id, user_profile)
            
            if not similar_users:
                return []
            
            # 获取相似用户喜欢的题目
            candidate_questions = await self._get_questions_liked_by_similar_users(
                similar_users, request
            )
            
            recommendations = []
            for question_id, score in candidate_questions[:request.num_questions * 2]:
                question = await self._get_question_by_id(question_id)
                if question:
                    recommendations.append(QuestionRecommendation(
                        question_id=question_id,
                        question=question,
                        score=score * self.algorithm_weights["collaborative"],
                        reason="基于相似用户的学习偏好推荐",
                        confidence=0.8,
                        recommendation_type="collaborative"
                    ))
            
            logger.debug(f"协同过滤推荐 {len(recommendations)} 道题目")
            return recommendations
            
        except Exception as e:
            logger.error(f"协同过滤推荐失败: {e}")
            return []
    
    async def _content_based_recommend(
        self,
        request: RecommendationRequest, 
        user_profile: UserProfile
    ) -> List[QuestionRecommendation]:
        """基于内容的推荐"""
        try:
            # 获取用户历史答题记录
            user_history = await self._get_user_answer_history(request.user_id)
            
            if not user_history:
                return []
            
            # 分析用户偏好的题目特征
            preferred_features = await self._extract_preferred_features(user_history)
            
            # 基于特征相似度推荐题目
            candidate_questions = await self._find_similar_questions_by_features(
                preferred_features, request
            )
            
            recommendations = []
            for question_id, similarity in candidate_questions[:request.num_questions * 2]:
                question = await self._get_question_by_id(question_id)
                if question:
                    recommendations.append(QuestionRecommendation(
                        question_id=question_id,
                        question=question,
                        score=similarity * self.algorithm_weights["content_based"],
                        reason="基于题目内容相似度推荐",
                        confidence=0.75,
                        recommendation_type="content_based"
                    ))
            
            logger.debug(f"内容推荐 {len(recommendations)} 道题目")
            return recommendations
            
        except Exception as e:
            logger.error(f"内容推荐失败: {e}")
            return []
    
    async def _knowledge_graph_recommend(
        self,
        request: RecommendationRequest,
        user_profile: UserProfile
    ) -> List[QuestionRecommendation]:
        """基于知识图谱的推荐"""
        try:
            # 获取用户薄弱知识点
            weak_knowledge_points = await self._identify_weak_knowledge_points(
                request.user_id, user_profile
            )
            
            if not weak_knowledge_points:
                return []
            
            # 基于知识图谱找到相关题目
            related_questions = await self._find_questions_by_knowledge_points(
                weak_knowledge_points, request
            )
            
            recommendations = []
            for question_id, relevance in related_questions[:request.num_questions * 2]:
                question = await self._get_question_by_id(question_id)
                if question:
                    recommendations.append(QuestionRecommendation(
                        question_id=question_id,
                        question=question,
                        score=relevance * self.algorithm_weights["knowledge_graph"],
                        reason="针对薄弱知识点的定向推荐",
                        confidence=0.85,
                        recommendation_type="knowledge_graph"
                    ))
            
            logger.debug(f"知识图谱推荐 {len(recommendations)} 道题目")
            return recommendations
            
        except Exception as e:
            logger.error(f"知识图谱推荐失败: {e}")
            return []
    
    async def _user_preference_recommend(
        self,
        request: RecommendationRequest,
        user_profile: UserProfile
    ) -> List[QuestionRecommendation]:
        """基于用户偏好的推荐"""
        try:
            # 根据用户偏好设置筛选题目
            preference_filters = self._build_preference_filters(user_profile)
            
            # 获取符合偏好的题目
            matching_questions = await self._get_questions_by_preferences(
                preference_filters, request
            )
            
            recommendations = []
            for question_id, match_score in matching_questions[:request.num_questions * 2]:
                question = await self._get_question_by_id(question_id)
                if question:
                    recommendations.append(QuestionRecommendation(
                        question_id=question_id,
                        question=question,
                        score=match_score * self.algorithm_weights["user_preference"],
                        reason="基于个人学习偏好推荐",
                        confidence=0.7,
                        recommendation_type="user_preference"
                    ))
            
            logger.debug(f"用户偏好推荐 {len(recommendations)} 道题目")
            return recommendations
            
        except Exception as e:
            logger.error(f"用户偏好推荐失败: {e}")
            return []
    
    async def _post_process_recommendations(
        self,
        recommendations: List[QuestionRecommendation],
        request: RecommendationRequest,
        user_profile: UserProfile
    ) -> List[QuestionRecommendation]:
        """后处理推荐结果"""
        
        # 1. 去重（基于question_id）
        unique_recommendations = {}
        for rec in recommendations:
            if rec.question_id not in unique_recommendations:
                unique_recommendations[rec.question_id] = rec
            else:
                # 如果重复，选择分数更高的
                if rec.score > unique_recommendations[rec.question_id].score:
                    unique_recommendations[rec.question_id] = rec
        
        recommendations = list(unique_recommendations.values())
        
        # 2. 按分数排序
        recommendations.sort(key=lambda x: x.score, reverse=True)
        
        # 3. 多样性优化
        recommendations = await self._optimize_diversity(recommendations, request)
        
        # 4. 应用业务规则过滤
        recommendations = await self._apply_business_filters(recommendations, request, user_profile)
        
        return recommendations
    
    async def _optimize_diversity(
        self,
        recommendations: List[QuestionRecommendation],
        request: RecommendationRequest
    ) -> List[QuestionRecommendation]:
        """优化推荐结果的多样性"""
        if len(recommendations) <= request.num_questions:
            return recommendations
        
        # 使用最大边际相关性(MMR)算法优化多样性
        selected = []
        remaining = recommendations.copy()
        
        # 选择得分最高的作为第一个
        if remaining:
            selected.append(remaining.pop(0))
        
        # 基于多样性选择后续题目
        while len(selected) < request.num_questions and remaining:
            best_candidate = None
            best_score = -1
            
            for candidate in remaining:
                # 计算与已选题目的多样性
                diversity_score = await self._calculate_diversity_score(candidate, selected)
                
                # 结合原始分数和多样性分数
                combined_score = 0.7 * candidate.score + 0.3 * diversity_score
                
                if combined_score > best_score:
                    best_score = combined_score
                    best_candidate = candidate
            
            if best_candidate:
                selected.append(best_candidate)
                remaining.remove(best_candidate)
        
        return selected
    
    async def _calculate_diversity_score(
        self, 
        candidate: QuestionRecommendation,
        selected: List[QuestionRecommendation]
    ) -> float:
        """计算题目多样性分数"""
        if not selected:
            return 1.0
        
        # 基于知识点、难度、题型等维度计算多样性
        diversity_scores = []
        
        for selected_item in selected:
            # 知识点多样性
            knowledge_diversity = await self._calculate_knowledge_diversity(
                candidate.question, selected_item.question
            )
            
            # 难度多样性
            difficulty_diversity = abs(
                candidate.question.difficulty_level - selected_item.question.difficulty_level
            ) / 5.0
            
            # 题型多样性
            type_diversity = 1.0 if candidate.question.question_type != selected_item.question.question_type else 0.0
            
            # 综合多样性分数
            diversity = (knowledge_diversity + difficulty_diversity + type_diversity) / 3.0
            diversity_scores.append(diversity)
        
        # 返回平均多样性分数
        return sum(diversity_scores) / len(diversity_scores)
    
    async def _recommend_for_new_user(
        self, 
        request: RecommendationRequest
    ) -> List[QuestionRecommendation]:
        """新用户推荐策略"""
        try:
            logger.info(f"🆕 为新用户推荐题目")
            
            # 推荐热门和高质量的入门题目
            query = """
            SELECT q.*, 
                   AVG(lr.is_correct::int) as correct_rate,
                   COUNT(lr.id) as attempt_count
            FROM questions q
            LEFT JOIN learning_records lr ON q.id = lr.question_id
            WHERE q.difficulty_level <= 3
            GROUP BY q.id
            HAVING COUNT(lr.id) >= 10
            ORDER BY correct_rate DESC, attempt_count DESC
            LIMIT $1
            """
            
            results = await self.db_service.fetch_all(query, request.num_questions * 2)
            
            recommendations = []
            for i, record in enumerate(results[:request.num_questions]):
                question = Question.from_db_record(record)
                recommendations.append(QuestionRecommendation(
                    question_id=str(question.id),
                    question=question,
                    score=0.8 - (i * 0.05),  # 递减分数
                    reason="推荐给新用户的优质入门题目",
                    confidence=0.6,
                    recommendation_type="new_user"
                ))
            
            return recommendations
            
        except Exception as e:
            logger.error(f"新用户推荐失败: {e}")
            return []
    
    async def _fallback_recommendation(
        self, 
        user_id: str, 
        num_questions: int
    ) -> List[QuestionRecommendation]:
        """降级推荐策略"""
        try:
            logger.warning(f"⚠️ 使用降级推荐策略")
            
            # 返回最近更新的高质量题目
            query = """
            SELECT * FROM questions 
            WHERE usage_count > 0 
            AND correct_rate BETWEEN 0.3 AND 0.8
            ORDER BY updated_at DESC, correct_rate DESC
            LIMIT $1
            """
            
            results = await self.db_service.fetch_all(query, num_questions)
            
            recommendations = []
            for record in results:
                question = Question.from_db_record(record)
                recommendations.append(QuestionRecommendation(
                    question_id=str(question.id),
                    question=question,
                    score=0.5,
                    reason="系统推荐的优质题目",
                    confidence=0.4,
                    recommendation_type="fallback"
                ))
            
            return recommendations
            
        except Exception as e:
            logger.error(f"降级推荐失败: {e}")
            return []
    
    async def update_recommendation_feedback(
        self, 
        user_id: str, 
        question_id: str,
        feedback: str,
        rating: Optional[int] = None
    ):
        """更新推荐反馈，用于优化推荐算法"""
        try:
            # 记录推荐反馈
            feedback_data = {
                "user_id": user_id,
                "question_id": question_id, 
                "feedback": feedback,
                "rating": rating,
                "timestamp": datetime.utcnow()
            }
            
            # 存储到数据库
            await self.db_service.insert_recommendation_feedback(feedback_data)
            
            # 清除相关缓存
            if user_id in self.recommendation_cache:
                del self.recommendation_cache[user_id]
                
            logger.info(f"📝 记录推荐反馈: user={user_id}, question={question_id}")
            
        except Exception as e:
            logger.error(f"记录推荐反馈失败: {e}")
    
    async def cleanup(self):
        """清理资源"""
        self.recommendation_cache.clear()
        self.last_cache_update.clear()
        await self.db_service.close()
        await self.vector_service.close()