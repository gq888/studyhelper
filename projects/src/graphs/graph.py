from langgraph.graph import StateGraph, END
from langchain_core.runnables import RunnableConfig
from langgraph.runtime import Runtime
from graphs.state import (
    GlobalState,
    GraphInput,
    GraphOutput
)
from graphs.nodes.extract_subtitle_node import extract_subtitle_node


# 创建状态图
builder = StateGraph(
    GlobalState,
    input_schema=GraphInput,
    output_schema=GraphOutput
)

# 添加节点
builder.add_node("extract_subtitle", extract_subtitle_node)

# 设置入口点
builder.set_entry_point("extract_subtitle")

# 添加边
builder.add_edge("extract_subtitle", END)

# 编译图
main_graph = builder.compile()
