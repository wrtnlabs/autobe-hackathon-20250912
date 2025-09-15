import { Module } from "@nestjs/common";

import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { AuthMemberController } from "./controllers/auth/member/AuthMemberController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { AuthDeveloperController } from "./controllers/auth/developer/AuthDeveloperController";
import { OauthserverAdminOauthserverconfigsController } from "./controllers/oauthServer/admin/oauthServerConfigs/OauthserverAdminOauthserverconfigsController";
import { OauthserverAdminOauthserverrediscachesController } from "./controllers/oauthServer/admin/oauthServerRedisCaches/OauthserverAdminOauthserverrediscachesController";
import { OauthserverAdminOauthserverguestsController } from "./controllers/oauthServer/admin/oauthServerGuests/OauthserverAdminOauthserverguestsController";
import { OauthserverGuestOauthserverguestsController } from "./controllers/oauthServer/guest/oauthServerGuests/OauthserverGuestOauthserverguestsController";
import { OauthserverMemberOauthservermembersController } from "./controllers/oauthServer/member/oauthServerMembers/OauthserverMemberOauthservermembersController";
import { OauthserverOauthservermembersController } from "./controllers/oauthServer/oauthServerMembers/OauthserverOauthservermembersController";
import { OauthserverAdminOauthservermembersController } from "./controllers/oauthServer/admin/oauthServerMembers/OauthserverAdminOauthservermembersController";
import { OauthserverAdminOauthserveradminsController } from "./controllers/oauthServer/admin/oauthServerAdmins/OauthserverAdminOauthserveradminsController";
import { OauthserverAdminOauthserverdevelopersController } from "./controllers/oauthServer/admin/oauthServerDevelopers/OauthserverAdminOauthserverdevelopersController";
import { OauthserverDeveloperOauthserverdevelopersController } from "./controllers/oauthServer/developer/oauthServerDevelopers/OauthserverDeveloperOauthserverdevelopersController";
import { OauthserverDeveloperAuthorizationcodesController } from "./controllers/oauthServer/developer/authorizationCodes/OauthserverDeveloperAuthorizationcodesController";
import { OauthserverAdminAuthorizationcodesController } from "./controllers/oauthServer/admin/authorizationCodes/OauthserverAdminAuthorizationcodesController";
import { OauthserverAdminAccesstokensController } from "./controllers/oauthServer/admin/accessTokens/OauthserverAdminAccesstokensController";
import { OauthserverMemberRefreshtokensController } from "./controllers/oauthServer/member/refreshTokens/OauthserverMemberRefreshtokensController";
import { OauthserverMemberIdtokensController } from "./controllers/oauthServer/member/idTokens/OauthserverMemberIdtokensController";
import { OauthserverAdminIdtokensController } from "./controllers/oauthServer/admin/idTokens/OauthserverAdminIdtokensController";
import { OauthserverAdminScopesController } from "./controllers/oauthServer/admin/scopes/OauthserverAdminScopesController";
import { OauthserverAdminOauthclientsController } from "./controllers/oauthServer/admin/oauthClients/OauthserverAdminOauthclientsController";
import { OauthserverDeveloperOauthclientsController } from "./controllers/oauthServer/developer/oauthClients/OauthserverDeveloperOauthclientsController";
import { OauthserverDeveloperOauthclientsClientprofilesController } from "./controllers/oauthServer/developer/oauthClients/clientProfiles/OauthserverDeveloperOauthclientsClientprofilesController";
import { OauthserverAdminSocialloginprovidersController } from "./controllers/oauthServer/admin/socialLoginProviders/OauthserverAdminSocialloginprovidersController";
import { OauthserverDeveloperSocialloginprovidersController } from "./controllers/oauthServer/developer/socialLoginProviders/OauthserverDeveloperSocialloginprovidersController";
import { OauthserverDeveloperSocialloginprovidersSocialuserlinksController } from "./controllers/oauthServer/developer/socialLoginProviders/socialUserLinks/OauthserverDeveloperSocialloginprovidersSocialuserlinksController";
import { OauthserverMemberSocialloginprovidersSocialuserlinksController } from "./controllers/oauthServer/member/socialLoginProviders/socialUserLinks/OauthserverMemberSocialloginprovidersSocialuserlinksController";
import { OauthserverMemberUserprofilesController } from "./controllers/oauthServer/member/userProfiles/OauthserverMemberUserprofilesController";
import { OauthserverMemberUserprofilesGameprofilesController } from "./controllers/oauthServer/member/userProfiles/gameProfiles/OauthserverMemberUserprofilesGameprofilesController";
import { OauthserverAdminUserpointsController } from "./controllers/oauthServer/admin/userPoints/OauthserverAdminUserpointsController";
import { OauthserverAdminUserpointsHistoriesController } from "./controllers/oauthServer/admin/userPoints/histories/OauthserverAdminUserpointsHistoriesController";
import { OauthserverMemberUserpointsHistoriesController } from "./controllers/oauthServer/member/userPoints/histories/OauthserverMemberUserpointsHistoriesController";
import { OauthserverMemberPointcouponsController } from "./controllers/oauthServer/member/pointCoupons/OauthserverMemberPointcouponsController";
import { OauthserverAdminPointcouponsController } from "./controllers/oauthServer/admin/pointCoupons/OauthserverAdminPointcouponsController";
import { OauthserverDeveloperPointcouponsController } from "./controllers/oauthServer/developer/pointCoupons/OauthserverDeveloperPointcouponsController";
import { OauthserverAdminUserpointcouponsController } from "./controllers/oauthServer/admin/userPointCoupons/OauthserverAdminUserpointcouponsController";
import { OauthserverAdminOauthserverauditlogsController } from "./controllers/oauthServer/admin/oauthServerAuditLogs/OauthserverAdminOauthserverauditlogsController";
import { OauthserverAdminOauthserveradminnotificationsController } from "./controllers/oauthServer/admin/oauthServerAdminNotifications/OauthserverAdminOauthserveradminnotificationsController";
import { OauthserverAdminOauthservertokenmonitorsController } from "./controllers/oauthServer/admin/oauthServerTokenMonitors/OauthserverAdminOauthservertokenmonitorsController";
import { OauthserverDeveloperOauthservertokenmonitorsController } from "./controllers/oauthServer/developer/oauthServerTokenMonitors/OauthserverDeveloperOauthservertokenmonitorsController";
import { OauthserverAdminOauthserverclientsecretregenerationsController } from "./controllers/oauthServer/admin/oauthServerClientSecretRegenerations/OauthserverAdminOauthserverclientsecretregenerationsController";

@Module({
  controllers: [
    AuthGuestController,
    AuthMemberController,
    AuthAdminController,
    AuthDeveloperController,
    OauthserverAdminOauthserverconfigsController,
    OauthserverAdminOauthserverrediscachesController,
    OauthserverAdminOauthserverguestsController,
    OauthserverGuestOauthserverguestsController,
    OauthserverMemberOauthservermembersController,
    OauthserverOauthservermembersController,
    OauthserverAdminOauthservermembersController,
    OauthserverAdminOauthserveradminsController,
    OauthserverAdminOauthserverdevelopersController,
    OauthserverDeveloperOauthserverdevelopersController,
    OauthserverDeveloperAuthorizationcodesController,
    OauthserverAdminAuthorizationcodesController,
    OauthserverAdminAccesstokensController,
    OauthserverMemberRefreshtokensController,
    OauthserverMemberIdtokensController,
    OauthserverAdminIdtokensController,
    OauthserverAdminScopesController,
    OauthserverAdminOauthclientsController,
    OauthserverDeveloperOauthclientsController,
    OauthserverDeveloperOauthclientsClientprofilesController,
    OauthserverAdminSocialloginprovidersController,
    OauthserverDeveloperSocialloginprovidersController,
    OauthserverDeveloperSocialloginprovidersSocialuserlinksController,
    OauthserverMemberSocialloginprovidersSocialuserlinksController,
    OauthserverMemberUserprofilesController,
    OauthserverMemberUserprofilesGameprofilesController,
    OauthserverAdminUserpointsController,
    OauthserverAdminUserpointsHistoriesController,
    OauthserverMemberUserpointsHistoriesController,
    OauthserverMemberPointcouponsController,
    OauthserverAdminPointcouponsController,
    OauthserverDeveloperPointcouponsController,
    OauthserverAdminUserpointcouponsController,
    OauthserverAdminOauthserverauditlogsController,
    OauthserverAdminOauthserveradminnotificationsController,
    OauthserverAdminOauthservertokenmonitorsController,
    OauthserverDeveloperOauthservertokenmonitorsController,
    OauthserverAdminOauthserverclientsecretregenerationsController,
  ],
})
export class MyModule {}
