"""
AI驱动的软考学习系统 - 核心配置
"""
import os
from typing import Optional, List
from pydantic import BaseSettings, Field
from functools import lru_cache


class Settings(BaseSettings):
    """应用设置配置"""
    
    # 应用基础配置
    app_name: str = "AI-Driven Ruankao Learning System"
    app_version: str = "1.0.0"
    debug: bool = False
    environment: str = "development"
    
    # API配置
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_prefix: str = "/api/v1"
    cors_origins: List[str] = ["*"]
    
    # 数据库配置
    database_url: str = Field(
        default="postgresql://user:password@localhost:5432/ruankao_ai",
        env="DATABASE_URL"
    )
    database_pool_size: int = 5
    database_max_overflow: int = 10
    
    # Redis配置
    redis_url: str = Field(
        default="redis://localhost:6379",
        env="REDIS_URL"
    )
    redis_session_expire: int = 86400  # 24小时
    
    # Qdrant向量数据库
    qdrant_host: str = Field(default="localhost", env="QDRANT_HOST")
    qdrant_port: int = Field(default=6333, env="QDRANT_PORT")
    qdrant_collection_name: str = "ruankao_knowledge"
    
    # LLM API配置
    openai_api_key: Optional[str] = Field(default=None, env="OPENAI_API_KEY")
    openai_api_base: Optional[str] = Field(default=None, env="OPENAI_API_BASE")
    anthropic_api_key: Optional[str] = Field(default=None, env="ANTHROPIC_API_KEY")
    
    # AutoGen配置
    autogen_cache_seed: int = 42
    autogen_max_consecutive_auto_reply: int = 5
    autogen_human_input_mode: str = "NEVER"
    
    # JWT认证
    jwt_secret_key: str = Field(
        default="your-secret-key-change-this-in-production",
        env="JWT_SECRET_KEY"
    )
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    
    # 日志配置
    log_level: str = "INFO"
    log_format: str = "json"
    
    # 推荐系统配置
    recommendation_batch_size: int = 100
    recommendation_cache_ttl: int = 3600  # 1小时
    
    # AI模型配置
    primary_llm_model: str = "gpt-4-turbo-preview"
    secondary_llm_model: str = "claude-3-sonnet-20240229"
    embedding_model: str = "text-embedding-3-small"
    
    # 业务规则配置
    max_questions_per_session: int = 50
    min_user_interactions_for_profile: int = 10
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """获取应用设置单例"""
    return Settings()


# 预设配置实例
settings = get_settings()


# 开发环境专用配置
class DevelopmentSettings(Settings):
    debug: bool = True
    environment: str = "development"
    log_level: str = "DEBUG"


# 生产环境专用配置  
class ProductionSettings(Settings):
    debug: bool = False
    environment: str = "production"
    log_level: str = "WARNING"
    cors_origins: List[str] = [
        "https://yourdomain.com",
        "https://www.yourdomain.com"
    ]


def get_environment_settings():
    """根据环境变量返回对应设置"""
    env = os.getenv("ENVIRONMENT", "development")
    
    if env == "production":
        return ProductionSettings()
    elif env == "development":
        return DevelopmentSettings()
    else:
        return Settings()