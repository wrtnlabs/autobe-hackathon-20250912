import { Module } from "@nestjs/common";

import { AuthEnduserController } from "./controllers/auth/endUser/AuthEnduserController";
import { AuthEnduserPasswordResetController } from "./controllers/auth/endUser/password/reset/AuthEnduserPasswordResetController";
import { AuthEnduserPasswordChangeController } from "./controllers/auth/endUser/password/change/AuthEnduserPasswordChangeController";
import { AuthDeveloperController } from "./controllers/auth/developer/AuthDeveloperController";
import { AuthAdministratorController } from "./controllers/auth/administrator/AuthAdministratorController";
import { TelegramfiledownloaderAdministratorEndusersController } from "./controllers/telegramFileDownloader/administrator/endusers/TelegramfiledownloaderAdministratorEndusersController";
import { TelegramfiledownloaderEndusersController } from "./controllers/telegramFileDownloader/endusers/TelegramfiledownloaderEndusersController";
import { TelegramfiledownloaderAdministratorDevelopersController } from "./controllers/telegramFileDownloader/administrator/developers/TelegramfiledownloaderAdministratorDevelopersController";
import { TelegramfiledownloaderDeveloperDevelopersController } from "./controllers/telegramFileDownloader/developer/developers/TelegramfiledownloaderDeveloperDevelopersController";
import { TelegramfiledownloaderAdministratorAdministratorsController } from "./controllers/telegramFileDownloader/administrator/administrators/TelegramfiledownloaderAdministratorAdministratorsController";
import { TelegramfiledownloaderAdministratorDownload_jobsController } from "./controllers/telegramFileDownloader/administrator/download-jobs/TelegramfiledownloaderAdministratorDownload_jobsController";
import { TelegramfiledownloaderEnduserDownload_jobsController } from "./controllers/telegramFileDownloader/endUser/download-jobs/TelegramfiledownloaderEnduserDownload_jobsController";
import { TelegramfiledownloaderDeveloperDownload_jobsController } from "./controllers/telegramFileDownloader/developer/download-jobs/TelegramfiledownloaderDeveloperDownload_jobsController";
import { TelegramfiledownloaderEnduserDownload_jobsFilesController } from "./controllers/telegramFileDownloader/endUser/download-jobs/files/TelegramfiledownloaderEnduserDownload_jobsFilesController";
import { TelegramfiledownloaderDeveloperDownload_jobsFilesController } from "./controllers/telegramFileDownloader/developer/download-jobs/files/TelegramfiledownloaderDeveloperDownload_jobsFilesController";
import { TelegramfiledownloaderAdministratorDownload_jobsFilesController } from "./controllers/telegramFileDownloader/administrator/download-jobs/files/TelegramfiledownloaderAdministratorDownload_jobsFilesController";
import { TelegramfiledownloaderAdministratorStorage_usagesController } from "./controllers/telegramFileDownloader/administrator/storage-usages/TelegramfiledownloaderAdministratorStorage_usagesController";
import { TelegramfiledownloaderDownload_job_statusesController } from "./controllers/telegramFileDownloader/download-job-statuses/TelegramfiledownloaderDownload_job_statusesController";
import { TelegramfiledownloaderEnduserSubscriptionPlansController } from "./controllers/telegramFileDownloader/endUser/subscription/plans/TelegramfiledownloaderEnduserSubscriptionPlansController";
import { TelegramfiledownloaderAdministratorSubscriptionPlansController } from "./controllers/telegramFileDownloader/administrator/subscription/plans/TelegramfiledownloaderAdministratorSubscriptionPlansController";
import { TelegramfiledownloaderEnduserPaymentsController } from "./controllers/telegramFileDownloader/endUser/payments/TelegramfiledownloaderEnduserPaymentsController";
import { TelegramfiledownloaderDeveloperPaymentsController } from "./controllers/telegramFileDownloader/developer/payments/TelegramfiledownloaderDeveloperPaymentsController";
import { TelegramfiledownloaderAdministratorPaymentsController } from "./controllers/telegramFileDownloader/administrator/payments/TelegramfiledownloaderAdministratorPaymentsController";
import { TelegramfiledownloaderAdministratorTransactionsController } from "./controllers/telegramFileDownloader/administrator/transactions/TelegramfiledownloaderAdministratorTransactionsController";
import { TelegramfiledownloaderAdministratorTelegramapicredentialsController } from "./controllers/telegramFileDownloader/administrator/telegramApiCredentials/TelegramfiledownloaderAdministratorTelegramapicredentialsController";
import { TelegramfiledownloaderAdministratorStripewebhooklogsController } from "./controllers/telegramFileDownloader/administrator/stripeWebhookLogs/TelegramfiledownloaderAdministratorStripewebhooklogsController";
import { TelegramfiledownloaderAdministratorAwss3uploadlogsController } from "./controllers/telegramFileDownloader/administrator/awsS3UploadLogs/TelegramfiledownloaderAdministratorAwss3uploadlogsController";
import { TelegramfiledownloaderAdministratorJobqueuesController } from "./controllers/telegramFileDownloader/administrator/jobQueues/TelegramfiledownloaderAdministratorJobqueuesController";
import { TelegramfiledownloaderAdministratorErrorlogsController } from "./controllers/telegramFileDownloader/administrator/errorLogs/TelegramfiledownloaderAdministratorErrorlogsController";
import { TelegramfiledownloaderAdministratorAuditlogsController } from "./controllers/telegramFileDownloader/administrator/auditLogs/TelegramfiledownloaderAdministratorAuditlogsController";
import { TelegramfiledownloaderAdministratorBillinglogsController } from "./controllers/telegramFileDownloader/administrator/billingLogs/TelegramfiledownloaderAdministratorBillinglogsController";
import { TelegramfiledownloaderAdministratorSubscriptionauditsController } from "./controllers/telegramFileDownloader/administrator/subscriptionAudits/TelegramfiledownloaderAdministratorSubscriptionauditsController";

@Module({
  controllers: [
    AuthEnduserController,
    AuthEnduserPasswordResetController,
    AuthEnduserPasswordChangeController,
    AuthDeveloperController,
    AuthAdministratorController,
    TelegramfiledownloaderAdministratorEndusersController,
    TelegramfiledownloaderEndusersController,
    TelegramfiledownloaderAdministratorDevelopersController,
    TelegramfiledownloaderDeveloperDevelopersController,
    TelegramfiledownloaderAdministratorAdministratorsController,
    TelegramfiledownloaderAdministratorDownload_jobsController,
    TelegramfiledownloaderEnduserDownload_jobsController,
    TelegramfiledownloaderDeveloperDownload_jobsController,
    TelegramfiledownloaderEnduserDownload_jobsFilesController,
    TelegramfiledownloaderDeveloperDownload_jobsFilesController,
    TelegramfiledownloaderAdministratorDownload_jobsFilesController,
    TelegramfiledownloaderAdministratorStorage_usagesController,
    TelegramfiledownloaderDownload_job_statusesController,
    TelegramfiledownloaderEnduserSubscriptionPlansController,
    TelegramfiledownloaderAdministratorSubscriptionPlansController,
    TelegramfiledownloaderEnduserPaymentsController,
    TelegramfiledownloaderDeveloperPaymentsController,
    TelegramfiledownloaderAdministratorPaymentsController,
    TelegramfiledownloaderAdministratorTransactionsController,
    TelegramfiledownloaderAdministratorTelegramapicredentialsController,
    TelegramfiledownloaderAdministratorStripewebhooklogsController,
    TelegramfiledownloaderAdministratorAwss3uploadlogsController,
    TelegramfiledownloaderAdministratorJobqueuesController,
    TelegramfiledownloaderAdministratorErrorlogsController,
    TelegramfiledownloaderAdministratorAuditlogsController,
    TelegramfiledownloaderAdministratorBillinglogsController,
    TelegramfiledownloaderAdministratorSubscriptionauditsController,
  ],
})
export class MyModule {}
