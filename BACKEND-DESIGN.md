# 软考助手后台管理系统设计文档

## 🎯 系统概述

软考助手后台管理系统是一个全栈解决方案，为微信小程序提供数据管理、AI分析和智能推荐服务。

### 核心功能模块
- 📚 **题库管理系统** - 题目的增删改查、分类管理、批量导入
- 👥 **用户管理系统** - 用户信息、学习记录、性能分析
- 💬 **对话记录管理** - AI对话历史、用户交互分析
- 🤖 **AI推荐引擎** - 智能题目推荐、个性化学习路径
- 📊 **数据分析平台** - 用户行为分析、学习效果统计
- ⚙️ **系统配置管理** - 参数配置、权限管理

## 🏗️ 技术架构

### 前端 (管理后台)
- **框架**: Next.js 14 (App Router)
- **UI组件库**: Tailwind CSS + shadcn/ui
- **状态管理**: Zustand
- **数据请求**: React Query (TanStack Query)
- **图表可视化**: Recharts
- **表单处理**: React Hook Form + Zod

### 后端 API
- **框架**: FastAPI (Python)
- **数据库**: PostgreSQL + Redis
- **ORM**: SQLAlchemy 2.0
- **认证**: JWT + OAuth2
- **API文档**: OpenAPI (Swagger)
- **任务队列**: Celery + Redis

### AI服务
- **推荐算法**: 协同过滤 + 内容过滤 + 深度学习
- **对话分析**: NLP处理 + 情感分析
- **知识图谱**: Neo4j (可选)

### 部署架构
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js       │    │   FastAPI       │    │   PostgreSQL    │
│   Admin Dashboard │◄──►│   Backend API   │◄──►│   Database      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │     Redis       │
                       │  Cache + Queue  │
                       └─────────────────┘
```

## 📊 数据库设计

### 核心表结构

#### 1. 用户表 (users)
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    openid VARCHAR(100) UNIQUE NOT NULL,
    union_id VARCHAR(100),
    nickname VARCHAR(100),
    avatar_url TEXT,
    phone VARCHAR(20),
    email VARCHAR(100),
    level INTEGER DEFAULT 1,
    experience INTEGER DEFAULT 0,
    target_exam VARCHAR(50),
    registration_date DATE,
    last_login_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. 题目表 (questions)
```sql
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    options JSONB NOT NULL, -- ['A. 选项1', 'B. 选项2', ...]
    correct_answer CHAR(1) NOT NULL,
    explanation TEXT,
    difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5),
    subject VARCHAR(100) NOT NULL,
    category VARCHAR(100),
    knowledge_points TEXT[], -- 知识点标签数组
    year INTEGER,
    source VARCHAR(100), -- 题目来源
    usage_count INTEGER DEFAULT 0,
    correct_rate DECIMAL(5,4) DEFAULT 0,
    created_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 索引优化
CREATE INDEX idx_questions_subject ON questions(subject);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);
CREATE INDEX idx_questions_category ON questions(category);
CREATE INDEX idx_questions_knowledge_points ON questions USING GIN(knowledge_points);
```

#### 3. 用户答题记录 (user_answers)
```sql
CREATE TABLE user_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    question_id UUID NOT NULL REFERENCES questions(id),
    selected_answer CHAR(1) NOT NULL,
    is_correct BOOLEAN NOT NULL,
    response_time_ms INTEGER, -- 答题时间(毫秒)
    session_id UUID, -- 答题会话ID
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id, question_id, session_id)
);

CREATE INDEX idx_user_answers_user_id ON user_answers(user_id);
CREATE INDEX idx_user_answers_question_id ON user_answers(question_id);
CREATE INDEX idx_user_answers_session ON user_answers(session_id);
```

#### 4. AI对话记录 (ai_conversations)
```sql
CREATE TABLE ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    question_id UUID REFERENCES questions(id), -- 关联题目(可选)
    message_type VARCHAR(20) NOT NULL, -- 'user' | 'assistant'
    content TEXT NOT NULL,
    metadata JSONB, -- 额外信息如建议、相关话题等
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_conversations_session ON ai_conversations(session_id);
CREATE INDEX idx_conversations_user ON ai_conversations(user_id);
CREATE INDEX idx_conversations_created_at ON ai_conversations(created_at);
```

#### 5. 用户学习统计 (user_stats)
```sql
CREATE TABLE user_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    date DATE NOT NULL,
    questions_answered INTEGER DEFAULT 0,
    questions_correct INTEGER DEFAULT 0,
    study_time_minutes INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    knowledge_mastery JSONB, -- 各知识点掌握度
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id, date)
);
```

#### 6. 推荐记录 (recommendations)
```sql
CREATE TABLE recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    question_id UUID NOT NULL REFERENCES questions(id),
    algorithm_type VARCHAR(50) NOT NULL, -- 推荐算法类型
    confidence_score DECIMAL(3,2), -- 推荐置信度
    reason TEXT, -- 推荐理由
    is_accepted BOOLEAN, -- 用户是否接受推荐
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 🔌 API设计

### RESTful API端点

#### 题目管理 API
```
GET    /api/questions              # 获取题目列表(分页+筛选)
POST   /api/questions              # 创建新题目
GET    /api/questions/{id}         # 获取题目详情
PUT    /api/questions/{id}         # 更新题目
DELETE /api/questions/{id}         # 删除题目
POST   /api/questions/batch        # 批量导入题目
GET    /api/questions/stats        # 题目统计信息
```

#### 用户管理 API
```
GET    /api/users                  # 获取用户列表
GET    /api/users/{id}             # 获取用户详情
PUT    /api/users/{id}             # 更新用户信息
GET    /api/users/{id}/stats       # 获取用户学习统计
GET    /api/users/{id}/answers     # 获取用户答题记录
DELETE /api/users/{id}             # 删除用户
```

#### 对话记录 API
```
GET    /api/conversations          # 获取对话记录列表
GET    /api/conversations/{sessionId} # 获取特定会话记录
DELETE /api/conversations/{sessionId} # 删除会话记录
GET    /api/conversations/stats    # 对话统计分析
```

#### AI推荐 API
```
POST   /api/recommendations/generate # 生成推荐
GET    /api/recommendations/{userId} # 获取用户推荐历史
POST   /api/recommendations/feedback # 推荐反馈
GET    /api/recommendations/performance # 推荐算法性能分析
```

#### 数据分析 API
```
GET    /api/analytics/overview     # 系统概览统计
GET    /api/analytics/users        # 用户行为分析
GET    /api/analytics/questions    # 题目使用分析
GET    /api/analytics/learning     # 学习效果分析
```

## 🤖 AI推荐系统设计

### 推荐算法架构

#### 1. 协同过滤推荐
```python
class CollaborativeFiltering:
    """基于用户行为的协同过滤"""
    
    def recommend_questions(self, user_id: str, limit: int = 10):
        # 找到相似用户
        similar_users = self.find_similar_users(user_id)
        # 基于相似用户的答题记录推荐
        return self.generate_recommendations(similar_users, limit)
```

#### 2. 内容过滤推荐
```python
class ContentBasedFiltering:
    """基于内容特征的推荐"""
    
    def recommend_questions(self, user_id: str, limit: int = 10):
        # 分析用户薄弱知识点
        weak_areas = self.analyze_weak_areas(user_id)
        # 推荐相关知识点题目
        return self.recommend_by_knowledge_points(weak_areas, limit)
```

#### 3. 深度学习推荐
```python
class DeepLearningRecommender:
    """基于深度学习的混合推荐"""
    
    def __init__(self):
        self.model = self.load_model()  # 加载训练好的模型
    
    def recommend_questions(self, user_features, limit: int = 10):
        # 使用神经网络进行推荐
        predictions = self.model.predict(user_features)
        return self.rank_questions(predictions, limit)
```

#### 4. 混合推荐策略
```python
class HybridRecommender:
    """混合多种推荐算法"""
    
    def __init__(self):
        self.cf_recommender = CollaborativeFiltering()
        self.cb_recommender = ContentBasedFiltering()
        self.dl_recommender = DeepLearningRecommender()
    
    def recommend(self, user_id: str, context: dict):
        # 获取各算法推荐结果
        cf_results = self.cf_recommender.recommend_questions(user_id)
        cb_results = self.cb_recommender.recommend_questions(user_id)
        dl_results = self.dl_recommender.recommend_questions(user_id)
        
        # 加权融合结果
        return self.weighted_fusion([cf_results, cb_results, dl_results])
```

## 📱 后台管理界面设计

### 主要页面结构

```
/admin
├── /dashboard          # 数据概览仪表板
├── /questions         # 题库管理
│   ├── /list         # 题目列表
│   ├── /create       # 创建题目
│   ├── /edit/[id]    # 编辑题目
│   └── /import       # 批量导入
├── /users            # 用户管理
│   ├── /list         # 用户列表  
│   └── /[id]         # 用户详情
├── /conversations    # 对话记录
│   ├── /list         # 会话列表
│   └── /[sessionId]  # 会话详情
├── /recommendations  # 推荐管理
│   ├── /algorithms   # 算法配置
│   └── /performance  # 性能分析
├── /analytics        # 数据分析
│   ├── /overview     # 概览
│   ├── /learning     # 学习分析
│   └── /reports      # 报表
└── /settings         # 系统设置
```

### 关键组件设计

#### 1. 题目管理组件
```typescript
// QuestionManager.tsx
interface Question {
  id: string;
  title: string;
  content: string;
  options: string[];
  correctAnswer: string;
  difficulty: number;
  subject: string;
  knowledgePoints: string[];
}

const QuestionManager: React.FC = () => {
  // 题目CRUD操作
  // 批量导入功能
  // 实时搜索和筛选
}
```

#### 2. 用户分析组件
```typescript
// UserAnalytics.tsx
interface UserStats {
  totalUsers: number;
  activeUsers: number;
  avgSessionTime: number;
  retentionRate: number;
}

const UserAnalytics: React.FC = () => {
  // 用户行为可视化
  // 学习进度统计
  // 用户画像分析
}
```

#### 3. AI对话分析组件
```typescript
// ConversationAnalytics.tsx
interface ConversationMetrics {
  totalConversations: number;
  avgResponseTime: number;
  satisfactionRate: number;
  commonTopics: string[];
}
```

## 🚀 实施计划

### Phase 1: 基础架构 (Week 1-2)
- [x] 系统设计文档
- [ ] 数据库schema创建
- [ ] FastAPI后端框架搭建
- [ ] Next.js管理后台初始化

### Phase 2: 核心功能 (Week 3-4)
- [ ] 题库管理CRUD功能
- [ ] 用户管理基础功能
- [ ] API接口实现
- [ ] 基础UI组件开发

### Phase 3: AI功能 (Week 5-6)
- [ ] 推荐算法实现
- [ ] 对话记录管理
- [ ] AI分析功能集成

### Phase 4: 数据分析 (Week 7-8)
- [ ] 数据分析报表
- [ ] 可视化图表
- [ ] 性能监控

### Phase 5: 优化部署 (Week 9-10)
- [ ] 性能优化
- [ ] 测试完善
- [ ] 生产环境部署

## 🔒 安全考虑

### 认证授权
- JWT token认证
- Role-based权限控制
- API频率限制
- 敏感操作审计日志

### 数据安全
- 数据库连接加密
- 敏感信息脱敏
- 定期数据备份
- GDPR合规性考虑

## 📈 性能优化

### 数据库优化
- 合理索引设计
- 查询语句优化
- 分库分表策略
- 读写分离

### 缓存策略
- Redis缓存热点数据
- CDN静态资源加速
- 前端组件缓存

### 监控告警
- 应用性能监控(APM)
- 数据库性能监控
- 错误日志收集
- 自动化告警

---

这个设计文档为软考助手后台管理系统提供了全面的技术方案。接下来我们将开始具体的实现工作。