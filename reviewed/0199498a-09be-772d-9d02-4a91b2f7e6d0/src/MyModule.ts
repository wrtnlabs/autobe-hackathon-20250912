import { Module } from "@nestjs/common";

import { AuthAuthenticateduserController } from "./controllers/auth/authenticatedUser/AuthAuthenticateduserController";
import { AuthSystemadminController } from "./controllers/auth/systemAdmin/AuthSystemadminController";
import { StoryfieldaiSystemadminAuthenticatedusersController } from "./controllers/storyfieldAi/systemAdmin/authenticatedUsers/StoryfieldaiSystemadminAuthenticatedusersController";
import { StoryfieldaiSystemadminSystemadminsController } from "./controllers/storyfieldAi/systemAdmin/systemAdmins/StoryfieldaiSystemadminSystemadminsController";
import { StoryfieldaiAuthenticateduserStoriesController } from "./controllers/storyfieldAi/authenticatedUser/stories/StoryfieldaiAuthenticateduserStoriesController";
import { StoryfieldaiSystemadminStoriesController } from "./controllers/storyfieldAi/systemAdmin/stories/StoryfieldaiSystemadminStoriesController";
import { StoryfieldaiAuthenticateduserStoriesPagesController } from "./controllers/storyfieldAi/authenticatedUser/stories/pages/StoryfieldaiAuthenticateduserStoriesPagesController";
import { StoryfieldaiSystemadminStoriesPagesController } from "./controllers/storyfieldAi/systemAdmin/stories/pages/StoryfieldaiSystemadminStoriesPagesController";
import { StoryfieldaiAuthenticateduserStoriesImagesController } from "./controllers/storyfieldAi/authenticatedUser/stories/images/StoryfieldaiAuthenticateduserStoriesImagesController";
import { StoryfieldaiSystemadminStoriesImagesController } from "./controllers/storyfieldAi/systemAdmin/stories/images/StoryfieldaiSystemadminStoriesImagesController";
import { StoryfieldaiAuthenticateduserStoriesTtsresultsController } from "./controllers/storyfieldAi/authenticatedUser/stories/ttsResults/StoryfieldaiAuthenticateduserStoriesTtsresultsController";
import { StoryfieldaiSystemadminStoriesTtsresultsController } from "./controllers/storyfieldAi/systemAdmin/stories/ttsResults/StoryfieldaiSystemadminStoriesTtsresultsController";
import { StoryfieldaiSystemadminTokensessionsController } from "./controllers/storyfieldAi/systemAdmin/tokenSessions/StoryfieldaiSystemadminTokensessionsController";
import { StoryfieldaiSystemadminTokenrevocationsController } from "./controllers/storyfieldAi/systemAdmin/tokenRevocations/StoryfieldaiSystemadminTokenrevocationsController";
import { StoryfieldaiSystemadminAuthauditlogsController } from "./controllers/storyfieldAi/systemAdmin/authAuditLogs/StoryfieldaiSystemadminAuthauditlogsController";
import { StoryfieldaiSystemadminIntegrationlogsController } from "./controllers/storyfieldAi/systemAdmin/integrationLogs/StoryfieldaiSystemadminIntegrationlogsController";
import { StoryfieldaiSystemadminS3uploadhistoriesController } from "./controllers/storyfieldAi/systemAdmin/s3UploadHistories/StoryfieldaiSystemadminS3uploadhistoriesController";
import { StoryfieldaiSystemadminExternalapifailuresController } from "./controllers/storyfieldAi/systemAdmin/externalApiFailures/StoryfieldaiSystemadminExternalapifailuresController";
import { StoryfieldaiSystemadminSystempoliciesController } from "./controllers/storyfieldAi/systemAdmin/systemPolicies/StoryfieldaiSystemadminSystempoliciesController";
import { StoryfieldaiSystemadminEnvsettingsController } from "./controllers/storyfieldAi/systemAdmin/envSettings/StoryfieldaiSystemadminEnvsettingsController";
import { StoryfieldaiSystemadminDeploymentlogsController } from "./controllers/storyfieldAi/systemAdmin/deploymentLogs/StoryfieldaiSystemadminDeploymentlogsController";
import { StoryfieldaiSystemadminServicealertsController } from "./controllers/storyfieldAi/systemAdmin/serviceAlerts/StoryfieldaiSystemadminServicealertsController";

@Module({
  controllers: [
    AuthAuthenticateduserController,
    AuthSystemadminController,
    StoryfieldaiSystemadminAuthenticatedusersController,
    StoryfieldaiSystemadminSystemadminsController,
    StoryfieldaiAuthenticateduserStoriesController,
    StoryfieldaiSystemadminStoriesController,
    StoryfieldaiAuthenticateduserStoriesPagesController,
    StoryfieldaiSystemadminStoriesPagesController,
    StoryfieldaiAuthenticateduserStoriesImagesController,
    StoryfieldaiSystemadminStoriesImagesController,
    StoryfieldaiAuthenticateduserStoriesTtsresultsController,
    StoryfieldaiSystemadminStoriesTtsresultsController,
    StoryfieldaiSystemadminTokensessionsController,
    StoryfieldaiSystemadminTokenrevocationsController,
    StoryfieldaiSystemadminAuthauditlogsController,
    StoryfieldaiSystemadminIntegrationlogsController,
    StoryfieldaiSystemadminS3uploadhistoriesController,
    StoryfieldaiSystemadminExternalapifailuresController,
    StoryfieldaiSystemadminSystempoliciesController,
    StoryfieldaiSystemadminEnvsettingsController,
    StoryfieldaiSystemadminDeploymentlogsController,
    StoryfieldaiSystemadminServicealertsController,
  ],
})
export class MyModule {}
