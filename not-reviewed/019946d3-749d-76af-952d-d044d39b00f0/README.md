# AutoBe Hackathon 2025 Session

Generation Result of AutoBe Hackathon 2025 participant.

- id: [019946d3-749d-76af-952d-d044d39b00f0](./019946d3-749d-76af-952d-d044d39b00f0)
- participant: 이세호 (koolee33@gmail.com)
- model: `openai/gpt-4.1-mini`
- phase: `interface`
- title: null
- review: null

## 1. User Message

> begin

## 2. Assistant Message

> Hello! I'm here to help you plan and develop your backend server. To get started, could you please tell me about the main purpose or goal of the system you want to build? What key tasks or features do you want this backend to support? If you’re unsure, feel free to describe your ideas or the problems you want to solve.

## 3. User Message

> I am trying to build a backend application that crawls a lot of information from multiple channels to collect news about politics.
> 
> After crawling, we need to post-process it with llm for generating useful contents for audiences.
> 
> Then, we will serve endpoints that return popular hot topics daily

## 4. Assistant Message

> Thanks for sharing the core idea. Let me summarize what I understand so far:
> 
> - The system will crawl news data about politics from multiple information channels.
> - Then it will process that raw data with a large language model (LLM) to generate useful content for audiences.
> - Finally, the system will provide API endpoints that serve hot popular political news topics daily.
> 
> To proceed, I’d like to get more details about each core part:
> 
> 1. Crawling:
> - What channels or sources do you want to crawl? (news websites, social media, RSS feeds, etc.)
> - How often should crawling run? (hourly, daily, etc.)
> - Do you have specific filtering rules for collecting relevant political news?  
> 
> 2. Post-processing with LLM:
> - What kind of content do you want to generate exactly? (summaries, analysis, highlights?)
> - Should the system store both raw and processed data?
> - Any preferences for which LLM or processing model to use?
> 
> 3. Serving endpoints:
> - What endpoints or features are required for hot topics? (top N topics, search, categories?)
> - Do you want any user roles or permissions to access the data?
> 
> Feel free to provide as much detail as you can, and I can help break it down step-by-step!

## 5. User Message

> 1. Crawling:
> - Channels and sources are unknown. we need to use all possible ways to collect data. Possibly, we can use tavily and other various known popular sources. Serp apis can be of choices too.
> - crawling schedule should be decided after how each crawling source behaves. Most of the time, it would be from 15~30 minutes, if I give a rough guess.
> - let's focus on South Korean Politics.
> 
> 2. Post-processing:
> - summaries/highlight would be one feature and analysis would be another feature. any additional features can be brainstormed and added. We should aim for a feature-rich system.
> - System should indeed keep the raw data somewhere in the database or a file storage.
> - we need to use cheap models and use prompt engineering to make them useful.
> 
> 3. Endpoints:
> - various types of endpoints would be preferred, as frontend can be flexible.
> - there are no permissions or roles.

## 6. Assistant Message

> Thank you for the detailed information. Here’s what I have captured as the core requirements:
> 
> 1. Crawling:
> - Data collection about South Korean politics from as many sources as possible, including services like Tavily, SERP APIs, and other popular channels.
> - Crawling frequency depends on each source’s behavior, roughly every 15 to 30 minutes.
> - Collect all relevant political news dynamically since exact sources are not fully known in advance.
> 
> 2. Post-processing with LLM:
> - Generate summaries and highlights as one set of features, and deeper analysis as another.
> - Keep raw crawled data stored in DB or file storage.
> - Use cost-effective LLMs combined with prompt engineering to generate enriched content.
> - System should be extendable to add more content generation features in the future.
> 
> 3. API Endpoints:
> - Provide various flexible endpoints to serve popular hot political topics daily.
> - No authentication or user roles needed.
> 
> Before I move forward to analyze and generate a structured specification, I want to clarify a few more things:
> 
> - For crawling, do you envision the system managing the crawling schedules and coordinating different source crawlers? Or are you planning to plug in existing crawlers or third-party services for this?
> - For storing raw data, do you prefer a database solution, file storage, or a hybrid? Any preferences about data retention duration?
> - For the popular hot topics API, should the system automatically determine popularity (e.g., via views, reactions, or an algorithm), or will this be manually curated?
> - Do you want the system to support any real-time or near real-time updates on hot topics, or is daily update sufficient?
> 
> Please let me know your thoughts or anything else you want to add.

## 7. User Message

> - For crawling, let's keep both options. For specific pages that we need to crawl, we crawl. For example, we could crawl new york times or some Korean magazine website. There shouldn't be one source to glean information, in diverse perspective: crawling within fixed website domain, using search engine apis, using news apis, etc. We should take in as much information as possible.
> - I think raw data should be stored in GCP/S3 along with duplication on local file storage. Local file storage should only guarantee TTL of 1 month.
> - we should invent our own algorithms for this. If you want we can brainstorm about this too. But if you are confident, you can proceed.
> - i highly prefer realtime. but there must be considerations with the crawlers since a lot of websites ban continuous crawling.

## 8. Assistant Message

> Thanks for the clarifications. Here's the refined understanding:
> 
> 1. Crawling:
> - Use diverse crawling methods all together: direct crawling of specific news websites (e.g., New York Times, Korean magazines), search engine APIs, news APIs, and possibly third-party services like Tavily.
> - Manage dynamic crawling schedules that adapt to each source's behavior.
> - Be mindful of crawling respectfully in real-time with intervals to avoid bans.
> 
> 2. Storage:
> - Raw crawled data will be stored primarily in cloud object storage (GCP or S3).
> - A local file storage will keep duplicates with a time-to-live (TTL) of 1 month as a fallback.
> 
> 3. Popularity Algorithm:
> - We will devise a custom algorithm to calculate real-time popularity of political news topics.
> - Real-time or near real-time data serving is preferred but needs to balance crawling constraints.
> 
> 4. API:
> - Flexible APIs to serve various types of popular hot topics daily or in real-time.
> - No user authentication needed.
> 
> If you agree, I can proceed to analyze this specification into a detailed requirements document that covers the system features, data models, and API needs. Or if you want, we can brainstorm the popularity algorithm approach first. What would you like to do next?

## 9. User Message

> We can continue.

## 10. Analyze

### Roles

Name | Kind | Description
-----|------|--------------
guest | guest | Unauthenticated users who can access public endpoints to retrieve news and popular topics. 

### Documents

- [`docs/analysis/01-service-overview.md`](./docs/analysis/01-service-overview.md)
- [`docs/analysis/02-user-roles.md`](./docs/analysis/02-user-roles.md)
- [`docs/analysis/03-functional-requirements.md`](./docs/analysis/03-functional-requirements.md)
- [`docs/analysis/04-user-scenarios.md`](./docs/analysis/04-user-scenarios.md)
- [`docs/analysis/05-crawling-system.md`](./docs/analysis/05-crawling-system.md)
- [`docs/analysis/06-llm-processing.md`](./docs/analysis/06-llm-processing.md)
- [`docs/analysis/07-api-endpoints.md`](./docs/analysis/07-api-endpoints.md)
- [`docs/analysis/08-popularity-algorithms.md`](./docs/analysis/08-popularity-algorithms.md)
- [`docs/analysis/09-storage-strategy.md`](./docs/analysis/09-storage-strategy.md)
- [`docs/analysis/10-non-functional-requirements.md`](./docs/analysis/10-non-functional-requirements.md)
- [`docs/analysis/11-analytics-reporting.md`](./docs/analysis/11-analytics-reporting.md)

## 11. User Message

> Design the database schema.

## 12. Prisma

- document: [`docs/ERD.md`](./docs/ERD.md)
- namespaces: 8
- tables: 22
- success: true

## 13. User Message

> Create the API interface specification.

## 14. Interface

- operations: 96
- schemas: 128