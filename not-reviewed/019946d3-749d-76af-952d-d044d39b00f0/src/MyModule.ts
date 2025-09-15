import { Module } from "@nestjs/common";

import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { PoliticalnewscrawlerPoliticalnewscrawlerCrawlsourcesController } from "./controllers/politicalNewsCrawler/politicalNewsCrawler/crawlSources/PoliticalnewscrawlerPoliticalnewscrawlerCrawlsourcesController";
import { PoliticalnewscrawlerGuestPoliticalnewscrawlerCrawlsourcesController } from "./controllers/politicalNewsCrawler/guest/politicalNewsCrawler/crawlSources/PoliticalnewscrawlerGuestPoliticalnewscrawlerCrawlsourcesController";
import { PoliticalnewscrawlerGuestPoliticalnewscrawlerCrawlpoliciesController } from "./controllers/politicalNewsCrawler/guest/politicalNewsCrawler/crawlPolicies/PoliticalnewscrawlerGuestPoliticalnewscrawlerCrawlpoliciesController";
import { PoliticalnewscrawlerGuestPoliticalnewscrawlerCrawlschedulesController } from "./controllers/politicalNewsCrawler/guest/politicalNewsCrawler/crawlSchedules/PoliticalnewscrawlerGuestPoliticalnewscrawlerCrawlschedulesController";
import { PoliticalnewscrawlerGuestGuestsController } from "./controllers/politicalNewsCrawler/guest/guests/PoliticalnewscrawlerGuestGuestsController";
import { PoliticalnewscrawlerGuestCrawljobsController } from "./controllers/politicalNewsCrawler/guest/crawlJobs/PoliticalnewscrawlerGuestCrawljobsController";
import { PoliticalnewscrawlerGuestCrawljobsCrawlattemptsController } from "./controllers/politicalNewsCrawler/guest/crawlJobs/crawlAttempts/PoliticalnewscrawlerGuestCrawljobsCrawlattemptsController";
import { PoliticalnewscrawlerCrawlattemptsCrawlednewsController } from "./controllers/politicalNewsCrawler/crawlAttempts/crawledNews/PoliticalnewscrawlerCrawlattemptsCrawlednewsController";
import { PoliticalnewscrawlerGuestRawdatastorageController } from "./controllers/politicalNewsCrawler/guest/rawDataStorage/PoliticalnewscrawlerGuestRawdatastorageController";
import { PoliticalnewscrawlerGuestRawdatastorageLocalcachefilesController } from "./controllers/politicalNewsCrawler/guest/rawDataStorage/localCacheFiles/PoliticalnewscrawlerGuestRawdatastorageLocalcachefilesController";
import { PoliticalnewscrawlerRawdatastorageProcessedcontentController } from "./controllers/politicalNewsCrawler/rawDataStorage/processedContent/PoliticalnewscrawlerRawdatastorageProcessedcontentController";
import { PoliticalnewscrawlerGuestRawdatastorageProcessedcontentController } from "./controllers/politicalNewsCrawler/guest/rawDataStorage/processedContent/PoliticalnewscrawlerGuestRawdatastorageProcessedcontentController";
import { PoliticalnewscrawlerLlmjobsController } from "./controllers/politicalNewsCrawler/llmJobs/PoliticalnewscrawlerLlmjobsController";
import { PoliticalnewscrawlerGuestLlmjobsResultsController } from "./controllers/politicalNewsCrawler/guest/llmJobs/results/PoliticalnewscrawlerGuestLlmjobsResultsController";
import { PoliticalnewscrawlerGuestLlmjobsMetadataController } from "./controllers/politicalNewsCrawler/guest/llmJobs/metadata/PoliticalnewscrawlerGuestLlmjobsMetadataController";
import { PoliticalnewscrawlerPopulartopicsController } from "./controllers/politicalNewsCrawler/popularTopics/PoliticalnewscrawlerPopulartopicsController";
import { PoliticalnewscrawlerGuestPopulartopicsController } from "./controllers/politicalNewsCrawler/guest/popularTopics/PoliticalnewscrawlerGuestPopulartopicsController";
import { PoliticalnewscrawlerGuestPopulartopicsPopularityscoresController } from "./controllers/politicalNewsCrawler/guest/popularTopics/popularityScores/PoliticalnewscrawlerGuestPopulartopicsPopularityscoresController";
import { PoliticalnewscrawlerPopulartopicsPopularityscoresController } from "./controllers/politicalNewsCrawler/popularTopics/popularityScores/PoliticalnewscrawlerPopulartopicsPopularityscoresController";
import { PoliticalnewscrawlerPopulartopicsTopicmentionsController } from "./controllers/politicalNewsCrawler/popularTopics/topicMentions/PoliticalnewscrawlerPopulartopicsTopicmentionsController";
import { PoliticalnewscrawlerApiAccesslogsController } from "./controllers/politicalNewsCrawler/api/accessLogs/PoliticalnewscrawlerApiAccesslogsController";
import { PoliticalnewscrawlerApiErrorlogsController } from "./controllers/politicalNewsCrawler/api/errorLogs/PoliticalnewscrawlerApiErrorlogsController";
import { PoliticalnewscrawlerApiUsagemetricsController } from "./controllers/politicalNewsCrawler/api/usageMetrics/PoliticalnewscrawlerApiUsagemetricsController";
import { PoliticalnewscrawlerCrawlalertsController } from "./controllers/politicalNewsCrawler/crawlAlerts/PoliticalnewscrawlerCrawlalertsController";
import { PoliticalnewscrawlerGuestCrawlalertsController } from "./controllers/politicalNewsCrawler/guest/crawlAlerts/PoliticalnewscrawlerGuestCrawlalertsController";
import { PoliticalnewscrawlerProcessingalertsController } from "./controllers/politicalNewsCrawler/processingAlerts/PoliticalnewscrawlerProcessingalertsController";
import { PoliticalnewscrawlerGuestProcessingalertsController } from "./controllers/politicalNewsCrawler/guest/processingAlerts/PoliticalnewscrawlerGuestProcessingalertsController";
import { PoliticalnewscrawlerGuestApialertsController } from "./controllers/politicalNewsCrawler/guest/apiAlerts/PoliticalnewscrawlerGuestApialertsController";

@Module({
  controllers: [
    AuthGuestController,
    PoliticalnewscrawlerPoliticalnewscrawlerCrawlsourcesController,
    PoliticalnewscrawlerGuestPoliticalnewscrawlerCrawlsourcesController,
    PoliticalnewscrawlerGuestPoliticalnewscrawlerCrawlpoliciesController,
    PoliticalnewscrawlerGuestPoliticalnewscrawlerCrawlschedulesController,
    PoliticalnewscrawlerGuestGuestsController,
    PoliticalnewscrawlerGuestCrawljobsController,
    PoliticalnewscrawlerGuestCrawljobsCrawlattemptsController,
    PoliticalnewscrawlerCrawlattemptsCrawlednewsController,
    PoliticalnewscrawlerGuestRawdatastorageController,
    PoliticalnewscrawlerGuestRawdatastorageLocalcachefilesController,
    PoliticalnewscrawlerRawdatastorageProcessedcontentController,
    PoliticalnewscrawlerGuestRawdatastorageProcessedcontentController,
    PoliticalnewscrawlerLlmjobsController,
    PoliticalnewscrawlerGuestLlmjobsResultsController,
    PoliticalnewscrawlerGuestLlmjobsMetadataController,
    PoliticalnewscrawlerPopulartopicsController,
    PoliticalnewscrawlerGuestPopulartopicsController,
    PoliticalnewscrawlerGuestPopulartopicsPopularityscoresController,
    PoliticalnewscrawlerPopulartopicsPopularityscoresController,
    PoliticalnewscrawlerPopulartopicsTopicmentionsController,
    PoliticalnewscrawlerApiAccesslogsController,
    PoliticalnewscrawlerApiErrorlogsController,
    PoliticalnewscrawlerApiUsagemetricsController,
    PoliticalnewscrawlerCrawlalertsController,
    PoliticalnewscrawlerGuestCrawlalertsController,
    PoliticalnewscrawlerProcessingalertsController,
    PoliticalnewscrawlerGuestProcessingalertsController,
    PoliticalnewscrawlerGuestApialertsController,
  ],
})
export class MyModule {}
