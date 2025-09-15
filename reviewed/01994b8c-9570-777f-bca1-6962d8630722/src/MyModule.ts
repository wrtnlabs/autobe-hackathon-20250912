import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { SubscriptionrenewalguardianAdminUsersController } from "./controllers/subscriptionRenewalGuardian/admin/users/SubscriptionrenewalguardianAdminUsersController";
import { SubscriptionrenewalguardianUserUsersController } from "./controllers/subscriptionRenewalGuardian/user/users/SubscriptionrenewalguardianUserUsersController";
import { SubscriptionrenewalguardianAdminAdminsController } from "./controllers/subscriptionRenewalGuardian/admin/admins/SubscriptionrenewalguardianAdminAdminsController";
import { SubscriptionrenewalguardianAdminGuestsController } from "./controllers/subscriptionRenewalGuardian/admin/guests/SubscriptionrenewalguardianAdminGuestsController";
import { SubscriptionrenewalguardianGuestsController } from "./controllers/subscriptionRenewalGuardian/guests/SubscriptionrenewalguardianGuestsController";
import { SubscriptionrenewalguardianUserGuestsController } from "./controllers/subscriptionRenewalGuardian/user/guests/SubscriptionrenewalguardianUserGuestsController";
import { SubscriptionrenewalguardianUserVendorsController } from "./controllers/subscriptionRenewalGuardian/user/vendors/SubscriptionrenewalguardianUserVendorsController";
import { SubscriptionrenewalguardianAdminVendorsController } from "./controllers/subscriptionRenewalGuardian/admin/vendors/SubscriptionrenewalguardianAdminVendorsController";
import { SubscriptionrenewalguardianUserSubscriptionsController } from "./controllers/subscriptionRenewalGuardian/user/subscriptions/SubscriptionrenewalguardianUserSubscriptionsController";
import { SubscriptionrenewalguardianAdminSubscriptionsController } from "./controllers/subscriptionRenewalGuardian/admin/subscriptions/SubscriptionrenewalguardianAdminSubscriptionsController";
import { SubscriptionrenewalguardianUserSubscriptionsRemindersettingsController } from "./controllers/subscriptionRenewalGuardian/user/subscriptions/reminderSettings/SubscriptionrenewalguardianUserSubscriptionsRemindersettingsController";
import { SubscriptionrenewalguardianUserSubscriptionsUpcomingrenewalsController } from "./controllers/subscriptionRenewalGuardian/user/subscriptions/upcomingRenewals/SubscriptionrenewalguardianUserSubscriptionsUpcomingrenewalsController";

@Module({
  controllers: [
    AuthUserController,
    AuthAdminController,
    AuthGuestController,
    SubscriptionrenewalguardianAdminUsersController,
    SubscriptionrenewalguardianUserUsersController,
    SubscriptionrenewalguardianAdminAdminsController,
    SubscriptionrenewalguardianAdminGuestsController,
    SubscriptionrenewalguardianGuestsController,
    SubscriptionrenewalguardianUserGuestsController,
    SubscriptionrenewalguardianUserVendorsController,
    SubscriptionrenewalguardianAdminVendorsController,
    SubscriptionrenewalguardianUserSubscriptionsController,
    SubscriptionrenewalguardianAdminSubscriptionsController,
    SubscriptionrenewalguardianUserSubscriptionsRemindersettingsController,
    SubscriptionrenewalguardianUserSubscriptionsUpcomingrenewalsController,
  ],
})
export class MyModule {}
