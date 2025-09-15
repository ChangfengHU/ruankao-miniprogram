"""
AutoGen多Agent管理器 - AI驱动学习系统的核心
"""
import asyncio
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum

import autogen
from autogen import AssistantAgent, UserProxyAgent, GroupChat, GroupChatManager
import structlog

from core.config import settings
from agents.question_recommend_agent import QuestionRecommendAgent
from agents.explanation_agent import ExplanationAgent
from agents.conversation_agent import ConversationAgent
from agents.user_profile_agent import UserProfileAgent
from agents.knowledge_graph_agent import KnowledgeGraphAgent


logger = structlog.get_logger(__name__)


class AgentType(Enum):
    """Agent类型枚举"""
    QUESTION_RECOMMEND = "question_recommend"
    EXPLANATION = "explanation"
    CONVERSATION = "conversation"
    USER_PROFILE = "user_profile"
    KNOWLEDGE_GRAPH = "knowledge_graph"


@dataclass
class AgentTask:
    """Agent任务数据结构"""
    task_id: str
    agent_type: AgentType
    user_id: str
    task_data: Dict[str, Any]
    priority: int = 1
    created_at: float = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = asyncio.get_event_loop().time()


class AgentManager:
    """
    AutoGen多Agent管理器
    
    协调和管理所有AI Agent的生命周期、任务分发和结果聚合
    """
    
    def __init__(self):
        self.agents: Dict[str, Any] = {}
        self.group_chat: Optional[GroupChat] = None
        self.chat_manager: Optional[GroupChatManager] = None
        self.task_queue: asyncio.Queue = asyncio.Queue()
        self.active_tasks: Dict[str, AgentTask] = {}
        self.is_initialized = False
        
        # LLM配置
        self.llm_config = {
            "config_list": [
                {
                    "model": settings.primary_llm_model,
                    "api_key": settings.openai_api_key,
                    "api_base": settings.openai_api_base,
                },
                {
                    "model": settings.secondary_llm_model,
                    "api_key": settings.anthropic_api_key,
                }
            ],
            "cache_seed": settings.autogen_cache_seed,
            "temperature": 0.1,
            "max_tokens": 2000,
        }
    
    async def initialize(self):
        """初始化Agent管理器和所有Agent"""
        try:
            logger.info("🤖 初始化AutoGen多Agent系统...")
            
            # 初始化各个专业Agent
            await self._initialize_agents()
            
            # 设置Group Chat用于Agent协作
            await self._setup_group_chat()
            
            # 启动任务处理循环
            asyncio.create_task(self._process_task_queue())
            
            self.is_initialized = True
            logger.info("✅ AutoGen Agent系统初始化完成")
            
        except Exception as e:
            logger.error(f"❌ Agent系统初始化失败: {e}", exc_info=True)
            raise
    
    async def _initialize_agents(self):
        """初始化所有专业Agent"""
        
        # 1. 题目推荐Agent
        self.agents[AgentType.QUESTION_RECOMMEND.value] = QuestionRecommendAgent(
            name="QuestionRecommender",
            system_message="""你是专业的题目推荐专家。
            
基于用户画像和学习历史，智能推荐最适合的软考题目。
考虑因素包括：
- 用户知识点掌握情况
- 学习偏好和难度适配
- 历年真题重要性权重
- 个性化学习路径

始终提供精准、个性化的推荐结果。""",
            llm_config=self.llm_config
        )
        
        # 2. 智能解析Agent
        self.agents[AgentType.EXPLANATION.value] = ExplanationAgent(
            name="ExplanationExpert", 
            system_message="""你是软考题目解析专家。

能够生成通俗易懂、层次分明的题目解析，包括：
- 题目核心考点分析
- 解题思路和步骤
- 相关知识点扩展
- 易错点提醒

根据用户水平调整解释的深度和复杂程度。""",
            llm_config=self.llm_config
        )
        
        # 3. 对话交互Agent
        self.agents[AgentType.CONVERSATION.value] = ConversationAgent(
            name="ConversationAssistant",
            system_message="""你是智能学习助手。

负责与用户进行多轮对话交互，提供：
- 问题答疑和知识解释
- 学习建议和方法指导
- 个性化学习计划调整
- 学习动机激励

保持友好、专业、富有耐心的对话风格。""",
            llm_config=self.llm_config
        )
        
        # 4. 用户画像Agent
        self.agents[AgentType.USER_PROFILE.value] = UserProfileAgent(
            name="UserProfileAnalyzer",
            system_message="""你是用户行为分析专家。

基于用户学习数据构建多维度画像：
- 知识掌握度分析
- 学习行为模式识别
- 认知特征建模
- 个性化偏好提取

为其他Agent提供准确的用户特征数据。""",
            llm_config=self.llm_config
        )
        
        # 5. 知识图谱Agent
        self.agents[AgentType.KNOWLEDGE_GRAPH.value] = KnowledgeGraphAgent(
            name="KnowledgeGraphBuilder",
            system_message="""你是软考知识图谱构建专家。

维护和优化知识点关系网络：
- 知识点权重计算
- 概念关系挖掘
- 学习路径规划
- 历年真题统计分析

为推荐系统提供知识结构支撑。""",
            llm_config=self.llm_config
        )
        
        logger.info(f"✅ 成功初始化 {len(self.agents)} 个专业Agent")
    
    async def _setup_group_chat(self):
        """设置Group Chat以支持Agent协作"""
        try:
            # 创建UserProxy作为任务协调者
            self.user_proxy = UserProxyAgent(
                name="TaskCoordinator",
                system_message="你是任务协调者，负责分配任务给专业Agent并整合结果。",
                human_input_mode="NEVER",
                max_consecutive_auto_reply=settings.autogen_max_consecutive_auto_reply,
                code_execution_config=False
            )
            
            # 创建Group Chat
            agents_list = list(self.agents.values()) + [self.user_proxy]
            
            self.group_chat = GroupChat(
                agents=agents_list,
                messages=[],
                max_round=10,
                speaker_selection_method="round_robin"
            )
            
            # 创建Chat Manager
            self.chat_manager = GroupChatManager(
                groupchat=self.group_chat,
                llm_config=self.llm_config,
                system_message="协调各Agent完成复杂的学习任务。"
            )
            
            logger.info("✅ Group Chat系统设置完成")
            
        except Exception as e:
            logger.error(f"❌ Group Chat设置失败: {e}")
            raise
    
    async def _process_task_queue(self):
        """处理Agent任务队列"""
        while True:
            try:
                # 获取任务（阻塞等待）
                task = await self.task_queue.get()
                
                logger.info(f"🎯 处理Agent任务: {task.task_id} - {task.agent_type.value}")
                
                # 将任务添加到活动任务列表
                self.active_tasks[task.task_id] = task
                
                # 异步处理任务
                asyncio.create_task(self._execute_agent_task(task))
                
                # 标记任务已完成获取
                self.task_queue.task_done()
                
            except Exception as e:
                logger.error(f"❌ 任务队列处理异常: {e}", exc_info=True)
                await asyncio.sleep(1)
    
    async def _execute_agent_task(self, task: AgentTask):
        """执行具体的Agent任务"""
        try:
            agent = self.agents.get(task.agent_type.value)
            if not agent:
                raise ValueError(f"未找到Agent类型: {task.agent_type.value}")
            
            # 根据Agent类型执行相应任务
            result = await self._dispatch_task_to_agent(agent, task)
            
            # 存储任务结果
            task.result = result
            task.status = "completed"
            
            logger.info(f"✅ 任务完成: {task.task_id}")
            
        except Exception as e:
            logger.error(f"❌ 任务执行失败: {task.task_id} - {e}", exc_info=True)
            task.status = "failed" 
            task.error = str(e)
        
        finally:
            # 从活动任务列表中移除
            if task.task_id in self.active_tasks:
                del self.active_tasks[task.task_id]
    
    async def _dispatch_task_to_agent(self, agent, task: AgentTask) -> Dict[str, Any]:
        """将任务分发给指定Agent"""
        task_type = task.agent_type
        task_data = task.task_data
        
        if task_type == AgentType.QUESTION_RECOMMEND:
            return await agent.recommend_questions(
                user_id=task.user_id,
                num_questions=task_data.get("num_questions", 10),
                filters=task_data.get("filters", {})
            )
            
        elif task_type == AgentType.EXPLANATION:
            return await agent.generate_explanation(
                question_id=task_data.get("question_id"),
                user_level=task_data.get("user_level", "intermediate")
            )
            
        elif task_type == AgentType.CONVERSATION:
            return await agent.handle_conversation(
                user_id=task.user_id,
                message=task_data.get("message"),
                context=task_data.get("context", {})
            )
            
        elif task_type == AgentType.USER_PROFILE:
            return await agent.update_user_profile(
                user_id=task.user_id,
                interaction_data=task_data.get("interaction_data")
            )
            
        elif task_type == AgentType.KNOWLEDGE_GRAPH:
            return await agent.update_knowledge_graph(
                task_data.get("update_type"),
                task_data.get("data")
            )
        
        else:
            raise ValueError(f"未支持的任务类型: {task_type}")
    
    async def submit_task(self, task: AgentTask) -> str:
        """提交Agent任务"""
        if not self.is_initialized:
            raise RuntimeError("Agent管理器未初始化")
        
        await self.task_queue.put(task)
        logger.info(f"📤 任务已提交: {task.task_id} - {task.agent_type.value}")
        
        return task.task_id
    
    async def get_task_result(self, task_id: str) -> Optional[Dict[str, Any]]:
        """获取任务结果"""
        task = self.active_tasks.get(task_id)
        if task and hasattr(task, 'result'):
            return task.result
        return None
    
    async def get_task_status(self, task_id: str) -> Optional[str]:
        """获取任务状态"""
        task = self.active_tasks.get(task_id)
        return getattr(task, 'status', None) if task else None
    
    async def health_check(self) -> bool:
        """Agent系统健康检查"""
        try:
            if not self.is_initialized:
                return False
            
            # 检查所有Agent是否正常
            for agent_type, agent in self.agents.items():
                if not hasattr(agent, 'name'):
                    return False
            
            # 检查任务队列是否正常
            queue_size = self.task_queue.qsize()
            active_tasks = len(self.active_tasks)
            
            logger.debug(f"Agent系统状态: 队列大小={queue_size}, 活跃任务={active_tasks}")
            
            return True
            
        except Exception as e:
            logger.error(f"Agent健康检查失败: {e}")
            return False
    
    async def cleanup(self):
        """清理Agent系统资源"""
        try:
            logger.info("🧹 清理Agent系统...")
            
            # 等待所有任务完成
            if not self.task_queue.empty():
                await self.task_queue.join()
            
            # 清理Agent资源
            for agent_type, agent in self.agents.items():
                if hasattr(agent, 'cleanup'):
                    await agent.cleanup()
            
            self.agents.clear()
            self.active_tasks.clear()
            
            logger.info("✅ Agent系统清理完成")
            
        except Exception as e:
            logger.error(f"❌ Agent系统清理失败: {e}")


# 单例模式的Agent管理器实例
agent_manager_instance = None

def get_agent_manager() -> AgentManager:
    """获取Agent管理器单例"""
    global agent_manager_instance
    if agent_manager_instance is None:
        agent_manager_instance = AgentManager()
    return agent_manager_instance