-- ============================================================
-- RAG向量检索升级脚本
-- 给FAQ表加向量字段，支持语义检索
-- ============================================================

-- 给ai_qa表加问题向量字段（JSON数组存float）
alter table ai_qa add column if not exists question_vector json comment '问题向量（Embedding结果）';
alter table ai_qa add column if not exists vector_status int default 0 comment '向量状态：0未向量化 1已向量化';

-- 给dish表也加向量字段，支持菜品语义检索
alter table dish add column if not exists search_vector json comment '菜品搜索向量（名称+描述拼接后的Embedding）';
alter table dish add column if not exists vector_status int default 0 comment '向量状态：0未向量化 1已向量化';
