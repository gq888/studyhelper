from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class GlobalState(BaseModel):
    """全局状态定义"""
    video_url: str = Field(default="", description="视频URL")
    subtitle_url: str = Field(default="", description="字幕文件URL")
    subtitle_text: str = Field(default="", description="字幕文本内容")


class GraphInput(BaseModel):
    """工作流输入"""
    video_url: str = Field(..., description="视频链接")


class GraphOutput(BaseModel):
    """工作流输出"""
    subtitle_url: str = Field(..., description="字幕文件URL")
    subtitle_text: str = Field(..., description="字幕文本内容")


class ExtractSubtitleInput(BaseModel):
    """字幕提取节点输入"""
    video_url: str = Field(..., description="视频URL")


class ExtractSubtitleOutput(BaseModel):
    """字幕提取节点输出"""
    subtitle_url: str = Field(..., description="字幕文件URL")
    subtitle_text: str = Field(..., description="字幕文本内容")
