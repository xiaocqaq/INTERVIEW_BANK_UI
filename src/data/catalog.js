    export const TRACK_META = [
      { id: 'java',   name: 'Java 题库',     shortName: 'Java',   totalCount: 0,
        badgeClass: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
        dotClass: 'bg-orange-500' },
      { id: 'python', name: 'Python 题库',   shortName: 'Python', totalCount: 0,
        badgeClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
        dotClass: 'bg-sky-500' },
      { id: 'llm',    name: '大模型应用 题库', shortName: '大模型应用', totalCount: 0,
        badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
        dotClass: 'bg-purple-500' }
    ];

    // 分类描述（后端不返回 desc，按 lang/slug 补文案）
    export const CATEGORY_DESC = {
      'java/basics': '泛型、反射、异常体系、String 与基础语法核心考点',
      'java/oop': '封装继承多态的对象模型、SOLID 原则、设计模式选型与领域建模',
      'java/collections': 'HashMap 底层扩容、ConcurrentHashMap、ArrayList 与树化机制',
      'java/concurrency': 'JMM 内存模型、volatile、synchronized 锁升级、AQS 与线程池',
      'java/jvm': '内存区域划分、类加载双亲委派、垃圾回收算法与 G1/ZGC 调优',
      'java/spring': 'IoC 容器启动、Bean 生命周期、三级缓存循环依赖、AOP 与事务传播',
      'java/mysql': 'InnoDB 索引 B+ 树、MVCC 多版本并发、事务隔离级别与慢查询优化',
      'java/redis': '五大数据结构底层、持久化 RDB/AOF、缓存穿透雪崩与分布式锁',
      'java/distributed': 'CAP 与 BASE、分布式事务 TCC/Saga、分布式锁、消息队列与幂等、服务治理',
      'python/basics': '动态类型机制、深浅拷贝、装饰器闭包、迭代器与生成器原理',
      'python/datastruct': 'dict 哈希表紧凑布局、list 动态扩容、set 集合与内存管理机制',
      'python/concurrency': '全局解释器锁 GIL、多进程 multiprocessing、asyncio 事件循环与协程',
      'python/oop': '魔术方法、MRO C3 超类线性化、元类 metaclass 与属性描述符',
      'python/stdlib': '虚拟环境管理、上下文管理器 with、日志体系、类型注解与单元测试',
      'python/web': 'FastAPI 异步依赖注入、Django ORM 中间件、WSGI 与 ASGI 协议对比',
      'llm/basics': 'Transformer 自注意力、Token 计费、Temperature/Top-p 采样与流式输出',
      'llm/prompting': 'Few-shot、CoT 思维链、结构化 JSON 输出约束与抗提示词注入',
      'llm/rag': '文档切分策略、Embedding 向量检索、混合检索 BM25 + Rerank 重排优化',
      'llm/tools': 'Function Calling 原理、ReAct 推理循环、Plan-and-Solve 与异常自愈',
      'llm/serving': 'KV Cache 显存优化、Prefix Caching、量化部署 vLLM 与吞吐延迟权衡',
      'llm/eval': 'RAGAS 评估指标、LLM-as-a-Judge、幻觉检测与护栏 Guardrails',
      'llm/mcp': 'Model Context Protocol 架构、Host/Client/Server 通信、Resources 与 Tools',
      'llm/skills': '动态上下文组装、渐进式技能挂载、长窗口压缩与 Token 预算分配',
      'llm/multiagent': 'Supervisor 路由模式、Handoffs 交接协议、层级协作与死循环防护',
      'llm/memory': '短期会话窗口、长期向量记忆、实体知识图谱提取与 Checkpointer',
      'llm/langchain': 'LCEL 声明式管道、Runnable 协议、OutputParser 与回调链路追踪',
      'llm/langgraph': 'StateGraph 状态机建模、条件边路由、Human-in-the-loop 断点审批',
      'llm/deepagent': 'DeepAgent 规划-执行-反思循环、子代理委派与深度搜索策略'
    };
