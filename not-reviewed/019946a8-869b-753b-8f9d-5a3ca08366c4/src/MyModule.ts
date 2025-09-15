import { Module } from "@nestjs/common";

import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { AuthMemberController } from "./controllers/auth/member/AuthMemberController";
import { AuthMemberPasswordResetController } from "./controllers/auth/member/password/reset/AuthMemberPasswordResetController";
import { AuthMemberPasswordChangeController } from "./controllers/auth/member/password/change/AuthMemberPasswordChangeController";
import { AuthMemberEmailVerifySendController } from "./controllers/auth/member/email/verify/send/AuthMemberEmailVerifySendController";
import { AuthMemberEmailVerifyConfirmController } from "./controllers/auth/member/email/verify/confirm/AuthMemberEmailVerifyConfirmController";
import { AuthMemberTwofactorEnableController } from "./controllers/auth/member/twoFactor/enable/AuthMemberTwofactorEnableController";
import { AuthMemberTwofactorDisableController } from "./controllers/auth/member/twoFactor/disable/AuthMemberTwofactorDisableController";
import { AuthAdminJoinController } from "./controllers/auth/admin/join/AuthAdminJoinController";
import { AuthAdminLoginController } from "./controllers/auth/admin/login/AuthAdminLoginController";
import { AuthAdminRefreshController } from "./controllers/auth/admin/refresh/AuthAdminRefreshController";
import { TravelrecordAdminTravelrecordguestsController } from "./controllers/travelRecord/admin/travelRecordGuests/TravelrecordAdminTravelrecordguestsController";
import { TravelrecordAdminTravelrecordmembersController } from "./controllers/travelRecord/admin/travelRecordMembers/TravelrecordAdminTravelrecordmembersController";
import { TravelrecordAdminTravelrecordadminsController } from "./controllers/travelRecord/admin/travelRecordAdmins/TravelrecordAdminTravelrecordadminsController";
import { TravelrecordMemberPlacesController } from "./controllers/travelRecord/member/places/TravelrecordMemberPlacesController";
import { TravelrecordMemberPlacesPhotosController } from "./controllers/travelRecord/member/places/photos/TravelrecordMemberPlacesPhotosController";
import { TravelrecordMemberReviewsController } from "./controllers/travelRecord/member/reviews/TravelrecordMemberReviewsController";
import { TravelrecordMemberFriendsController } from "./controllers/travelRecord/member/friends/TravelrecordMemberFriendsController";
import { TravelrecordAdminPrivacysettingsController } from "./controllers/travelRecord/admin/privacySettings/TravelrecordAdminPrivacysettingsController";
import { TravelrecordMemberPrivacysettingsController } from "./controllers/travelRecord/member/privacySettings/TravelrecordMemberPrivacysettingsController";

@Module({
  controllers: [
    AuthGuestController,
    AuthMemberController,
    AuthMemberPasswordResetController,
    AuthMemberPasswordChangeController,
    AuthMemberEmailVerifySendController,
    AuthMemberEmailVerifyConfirmController,
    AuthMemberTwofactorEnableController,
    AuthMemberTwofactorDisableController,
    AuthAdminJoinController,
    AuthAdminLoginController,
    AuthAdminRefreshController,
    TravelrecordAdminTravelrecordguestsController,
    TravelrecordAdminTravelrecordmembersController,
    TravelrecordAdminTravelrecordadminsController,
    TravelrecordMemberPlacesController,
    TravelrecordMemberPlacesPhotosController,
    TravelrecordMemberReviewsController,
    TravelrecordMemberFriendsController,
    TravelrecordAdminPrivacysettingsController,
    TravelrecordMemberPrivacysettingsController,
  ],
})
export class MyModule {}
