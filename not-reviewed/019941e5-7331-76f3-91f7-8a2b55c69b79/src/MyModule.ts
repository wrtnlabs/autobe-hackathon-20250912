import { Module } from "@nestjs/common";

import { AuthFreelanceruserController } from "./controllers/auth/freelancerUser/AuthFreelanceruserController";
import { AuthCorporateuserController } from "./controllers/auth/corporateUser/AuthCorporateuserController";
import { AuthTeamleaderController } from "./controllers/auth/teamLeader/AuthTeamleaderController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { EasysignAdminEasysignconfigurationsController } from "./controllers/easySign/admin/easySignConfigurations/EasysignAdminEasysignconfigurationsController";
import { EasysignAdminEasysignsettingsController } from "./controllers/easySign/admin/easySignSettings/EasysignAdminEasysignsettingsController";

@Module({
  controllers: [
    AuthFreelanceruserController,
    AuthCorporateuserController,
    AuthTeamleaderController,
    AuthAdminController,
    EasysignAdminEasysignconfigurationsController,
    EasysignAdminEasysignsettingsController,
  ],
})
export class MyModule {}
