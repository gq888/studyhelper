import requests
from langchain_core.runnables import RunnableConfig
from langgraph.runtime import Runtime
from coze_coding_dev_sdk.video_edit import VideoEditClient
from coze_coding_utils.runtime_ctx.context import Context
from graphs.state import ExtractSubtitleInput, ExtractSubtitleOutput


def extract_subtitle_node(
    state: ExtractSubtitleInput,
    config: RunnableConfig,
    runtime: Runtime[Context]
) -> ExtractSubtitleOutput:
    """
    title: 字幕提取
    desc: 从视频中提取字幕文件，支持自动语音识别生成字幕
    integrations: video-edit
    """
    ctx = runtime.context
    
    # 使用 video-edit 技能从视频提取字幕
    client = VideoEditClient(ctx=ctx)
    
    # 调用 audio_to_subtitle 方法提取字幕
    # 该方法会自动识别视频中的语音并生成字幕文件
    response = client.audio_to_subtitle(
        source=state.video_url,
        subtitle_type="srt"
    )
    
    subtitle_url = response.url
    
    # 下载字幕文件内容
    subtitle_text = ""
    try:
        subtitle_response = requests.get(subtitle_url, timeout=30)
        subtitle_response.raise_for_status()
        subtitle_text = subtitle_response.text
    except Exception as e:
        # 如果下载失败，至少返回URL
        subtitle_text = f"字幕文件URL: {subtitle_url}"
    
    return ExtractSubtitleOutput(
        subtitle_url=subtitle_url,
        subtitle_text=subtitle_text
    )
