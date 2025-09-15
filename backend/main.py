"""
AI驱动的软考学习系统 - FastAPI应用入口
"""
import asyncio
from contextlib import asynccontextmanager
from typing import Dict, Any

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import uvicorn
import structlog

from core.config import settings
from core.database import DatabaseManager
from core.redis_client import RedisManager
from core.logging_config import setup_logging
from agents.agent_manager import AgentManager
from api.routes import auth, recommendations, questions, users, conversations


# 设置结构化日志
setup_logging()
logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时初始化
    logger.info("🚀 启动AI驱动学习系统...")
    
    try:
        # 初始化数据库连接
        await DatabaseManager.initialize()
        logger.info("✅ 数据库连接初始化完成")
        
        # 初始化Redis连接
        await RedisManager.initialize()
        logger.info("✅ Redis连接初始化完成")
        
        # 初始化AI Agent管理器
        agent_manager = AgentManager()
        await agent_manager.initialize()
        app.state.agent_manager = agent_manager
        logger.info("✅ AutoGen Agent系统初始化完成")
        
        logger.info("🎉 系统启动完成，所有服务就绪!")
        
        yield
        
    except Exception as e:
        logger.error(f"❌ 系统启动失败: {e}", exc_info=True)
        raise
    
    finally:
        # 关闭时清理
        logger.info("🛑 正在关闭系统...")
        
        try:
            if hasattr(app.state, 'agent_manager'):
                await app.state.agent_manager.cleanup()
                logger.info("✅ Agent系统清理完成")
            
            await RedisManager.cleanup()
            logger.info("✅ Redis连接清理完成")
            
            await DatabaseManager.cleanup()
            logger.info("✅ 数据库连接清理完成")
            
        except Exception as e:
            logger.error(f"❌ 系统关闭时出错: {e}", exc_info=True)


# 创建FastAPI应用
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="基于AutoGen多Agent协作的智能软考刷题系统",
    lifespan=lifespan,
    docs_url="/api/docs" if settings.debug else None,
    redoc_url="/api/redoc" if settings.debug else None,
    openapi_url="/api/openapi.json" if settings.debug else None
)

# 添加中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=["localhost", "127.0.0.1", "*"]
)


# 全局异常处理
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """HTTP异常处理"""
    logger.error(
        "HTTP异常",
        path=request.url.path,
        method=request.method,
        status_code=exc.status_code,
        detail=exc.detail
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "message": exc.detail,
            "status_code": exc.status_code,
            "path": str(request.url.path)
        }
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """请求验证异常处理"""
    logger.error(
        "请求验证异常",
        path=request.url.path,
        method=request.method,
        errors=exc.errors()
    )
    
    return JSONResponse(
        status_code=422,
        content={
            "error": True,
            "message": "请求参数验证失败",
            "details": exc.errors(),
            "status_code": 422
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """通用异常处理"""
    logger.error(
        "未处理异常",
        path=request.url.path,
        method=request.method,
        exception=str(exc),
        exc_info=True
    )
    
    return JSONResponse(
        status_code=500,
        content={
            "error": True,
            "message": "服务器内部错误",
            "status_code": 500
        }
    )


# 健康检查端点
@app.get("/health")
async def health_check():
    """系统健康检查"""
    try:
        # 检查数据库连接
        db_status = await DatabaseManager.health_check()
        
        # 检查Redis连接
        redis_status = await RedisManager.health_check()
        
        # 检查Agent系统
        agent_status = True
        if hasattr(app.state, 'agent_manager'):
            agent_status = await app.state.agent_manager.health_check()
        
        return {
            "status": "healthy",
            "version": settings.app_version,
            "services": {
                "database": "ok" if db_status else "error",
                "redis": "ok" if redis_status else "error", 
                "agents": "ok" if agent_status else "error"
            },
            "environment": settings.environment,
            "timestamp": asyncio.get_event_loop().time()
        }
        
    except Exception as e:
        logger.error(f"健康检查失败: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "error": str(e),
                "timestamp": asyncio.get_event_loop().time()
            }
        )


# 系统信息端点
@app.get("/info")
async def system_info():
    """系统信息"""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment,
        "api_prefix": settings.api_prefix,
        "features": {
            "ai_recommendation": True,
            "user_profiling": True,
            "intelligent_explanation": True,
            "multi_turn_conversation": True,
            "knowledge_graph": True
        }
    }


# 注册API路由
app.include_router(
    auth.router,
    prefix=settings.api_prefix + "/auth",
    tags=["认证"]
)

app.include_router(
    users.router,
    prefix=settings.api_prefix + "/users",
    tags=["用户管理"]
)

app.include_router(
    questions.router,
    prefix=settings.api_prefix + "/questions",
    tags=["题目管理"]
)

app.include_router(
    recommendations.router,
    prefix=settings.api_prefix + "/recommendations",
    tags=["智能推荐"]
)

app.include_router(
    conversations.router,
    prefix=settings.api_prefix + "/conversations",
    tags=["对话交互"]
)


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.debug,
        log_level=settings.log_level.lower()
    )