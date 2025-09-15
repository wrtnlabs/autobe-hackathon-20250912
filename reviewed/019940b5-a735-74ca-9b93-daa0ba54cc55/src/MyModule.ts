import { Module } from "@nestjs/common";

import { AuthRegularuserJoinController } from "./controllers/auth/regularUser/join/AuthRegularuserJoinController";
import { AuthRegularuserLoginController } from "./controllers/auth/regularUser/login/AuthRegularuserLoginController";
import { AuthRegularuserRefreshController } from "./controllers/auth/regularUser/refresh/AuthRegularuserRefreshController";
import { AuthEventorganizerController } from "./controllers/auth/eventOrganizer/AuthEventorganizerController";
import { AuthAdminJoinController } from "./controllers/auth/admin/join/AuthAdminJoinController";
import { AuthAdminLoginController } from "./controllers/auth/admin/login/AuthAdminLoginController";
import { AuthAdminRefreshController } from "./controllers/auth/admin/refresh/AuthAdminRefreshController";
import { EventregistrationAdminRegularusersController } from "./controllers/eventRegistration/admin/regularUsers/EventregistrationAdminRegularusersController";
import { EventregistrationAdminRegularusersEmailverificationtokensController } from "./controllers/eventRegistration/admin/regularUsers/emailVerificationTokens/EventregistrationAdminRegularusersEmailverificationtokensController";
import { EventregistrationRegularuserRegularusersAttendeesController } from "./controllers/eventRegistration/regularUser/regularUsers/attendees/EventregistrationRegularuserRegularusersAttendeesController";
import { EventregistrationAdminRegularusersAttendeesController } from "./controllers/eventRegistration/admin/regularUsers/attendees/EventregistrationAdminRegularusersAttendeesController";
import { EventregistrationEventorganizerRegularusersAttendeesController } from "./controllers/eventRegistration/eventOrganizer/regularUsers/attendees/EventregistrationEventorganizerRegularusersAttendeesController";
import { EventregistrationRegularuserRegularusersWaitlistsController } from "./controllers/eventRegistration/regularUser/regularUsers/waitlists/EventregistrationRegularuserRegularusersWaitlistsController";
import { EventregistrationEventorganizerRegularusersWaitlistsController } from "./controllers/eventRegistration/eventOrganizer/regularUsers/waitlists/EventregistrationEventorganizerRegularusersWaitlistsController";
import { EventregistrationAdminRegularusersWaitlistsController } from "./controllers/eventRegistration/admin/regularUsers/waitlists/EventregistrationAdminRegularusersWaitlistsController";
import { EventregistrationRegularuserRegularusersNotificationsController } from "./controllers/eventRegistration/regularUser/regularUsers/notifications/EventregistrationRegularuserRegularusersNotificationsController";
import { EventregistrationAdminRegularusersNotificationsController } from "./controllers/eventRegistration/admin/regularUsers/notifications/EventregistrationAdminRegularusersNotificationsController";
import { EventregistrationAdminEventorganizersController } from "./controllers/eventRegistration/admin/eventOrganizers/EventregistrationAdminEventorganizersController";
import { EventregistrationAdminAdminsController } from "./controllers/eventRegistration/admin/admins/EventregistrationAdminAdminsController";
import { EventregistrationAdminOrganizerrequestsController } from "./controllers/eventRegistration/admin/organizerRequests/EventregistrationAdminOrganizerrequestsController";
import { EventregistrationEventorganizerOrganizerrequestsController } from "./controllers/eventRegistration/eventOrganizer/organizerRequests/EventregistrationEventorganizerOrganizerrequestsController";
import { EventregistrationRegularuserOrganizerrequestsController } from "./controllers/eventRegistration/regularUser/organizerRequests/EventregistrationRegularuserOrganizerrequestsController";
import { EventregistrationEventsController } from "./controllers/eventRegistration/events/EventregistrationEventsController";
import { EventregistrationEventorganizerEventsController } from "./controllers/eventRegistration/eventOrganizer/events/EventregistrationEventorganizerEventsController";
import { EventregistrationAdminEventsController } from "./controllers/eventRegistration/admin/events/EventregistrationAdminEventsController";
import { EventregistrationAdminEventcategoriesController } from "./controllers/eventRegistration/admin/eventCategories/EventregistrationAdminEventcategoriesController";
import { EventregistrationAdminEventattendeesController } from "./controllers/eventRegistration/admin/eventAttendees/EventregistrationAdminEventattendeesController";
import { EventregistrationEventorganizerEventattendeesController } from "./controllers/eventRegistration/eventOrganizer/eventAttendees/EventregistrationEventorganizerEventattendeesController";
import { EventregistrationRegularuserEventattendeesController } from "./controllers/eventRegistration/regularUser/eventAttendees/EventregistrationRegularuserEventattendeesController";
import { EventregistrationAdminEventsAttendeesController } from "./controllers/eventRegistration/admin/events/attendees/EventregistrationAdminEventsAttendeesController";
import { EventregistrationEventorganizerEventsAttendeesController } from "./controllers/eventRegistration/eventOrganizer/events/attendees/EventregistrationEventorganizerEventsAttendeesController";
import { EventregistrationRegularuserEventsAttendeesController } from "./controllers/eventRegistration/regularUser/events/attendees/EventregistrationRegularuserEventsAttendeesController";
import { EventregistrationRegularuserEventwaitlistsController } from "./controllers/eventRegistration/regularUser/eventWaitlists/EventregistrationRegularuserEventwaitlistsController";
import { EventregistrationAdminEventwaitlistsController } from "./controllers/eventRegistration/admin/eventWaitlists/EventregistrationAdminEventwaitlistsController";
import { EventregistrationEventorganizerEventwaitlistsController } from "./controllers/eventRegistration/eventOrganizer/eventWaitlists/EventregistrationEventorganizerEventwaitlistsController";
import { EventregistrationEventorganizerEventsWaitlistsController } from "./controllers/eventRegistration/eventOrganizer/events/waitlists/EventregistrationEventorganizerEventsWaitlistsController";
import { EventregistrationAdminEventsWaitlistsController } from "./controllers/eventRegistration/admin/events/waitlists/EventregistrationAdminEventsWaitlistsController";
import { EventregistrationRegularuserEventsWaitlistsController } from "./controllers/eventRegistration/regularUser/events/waitlists/EventregistrationRegularuserEventsWaitlistsController";
import { EventregistrationAdminEventcapacityoverridesController } from "./controllers/eventRegistration/admin/eventCapacityOverrides/EventregistrationAdminEventcapacityoverridesController";
import { EventregistrationAdminEventsCapacityoverridesController } from "./controllers/eventRegistration/admin/events/capacityOverrides/EventregistrationAdminEventsCapacityoverridesController";
import { EventregistrationAdminNotificationsController } from "./controllers/eventRegistration/admin/notifications/EventregistrationAdminNotificationsController";
import { EventregistrationEventorganizerNotificationsController } from "./controllers/eventRegistration/eventOrganizer/notifications/EventregistrationEventorganizerNotificationsController";
import { EventregistrationRegularuserNotificationsController } from "./controllers/eventRegistration/regularUser/notifications/EventregistrationRegularuserNotificationsController";
import { EventregistrationAdminEventanalyticsController } from "./controllers/eventRegistration/admin/eventAnalytics/EventregistrationAdminEventanalyticsController";
import { EventregistrationEventorganizerEventanalyticsController } from "./controllers/eventRegistration/eventOrganizer/eventAnalytics/EventregistrationEventorganizerEventanalyticsController";

@Module({
  controllers: [
    AuthRegularuserJoinController,
    AuthRegularuserLoginController,
    AuthRegularuserRefreshController,
    AuthEventorganizerController,
    AuthAdminJoinController,
    AuthAdminLoginController,
    AuthAdminRefreshController,
    EventregistrationAdminRegularusersController,
    EventregistrationAdminRegularusersEmailverificationtokensController,
    EventregistrationRegularuserRegularusersAttendeesController,
    EventregistrationAdminRegularusersAttendeesController,
    EventregistrationEventorganizerRegularusersAttendeesController,
    EventregistrationRegularuserRegularusersWaitlistsController,
    EventregistrationEventorganizerRegularusersWaitlistsController,
    EventregistrationAdminRegularusersWaitlistsController,
    EventregistrationRegularuserRegularusersNotificationsController,
    EventregistrationAdminRegularusersNotificationsController,
    EventregistrationAdminEventorganizersController,
    EventregistrationAdminAdminsController,
    EventregistrationAdminOrganizerrequestsController,
    EventregistrationEventorganizerOrganizerrequestsController,
    EventregistrationRegularuserOrganizerrequestsController,
    EventregistrationEventsController,
    EventregistrationEventorganizerEventsController,
    EventregistrationAdminEventsController,
    EventregistrationAdminEventcategoriesController,
    EventregistrationAdminEventattendeesController,
    EventregistrationEventorganizerEventattendeesController,
    EventregistrationRegularuserEventattendeesController,
    EventregistrationAdminEventsAttendeesController,
    EventregistrationEventorganizerEventsAttendeesController,
    EventregistrationRegularuserEventsAttendeesController,
    EventregistrationRegularuserEventwaitlistsController,
    EventregistrationAdminEventwaitlistsController,
    EventregistrationEventorganizerEventwaitlistsController,
    EventregistrationEventorganizerEventsWaitlistsController,
    EventregistrationAdminEventsWaitlistsController,
    EventregistrationRegularuserEventsWaitlistsController,
    EventregistrationAdminEventcapacityoverridesController,
    EventregistrationAdminEventsCapacityoverridesController,
    EventregistrationAdminNotificationsController,
    EventregistrationEventorganizerNotificationsController,
    EventregistrationRegularuserNotificationsController,
    EventregistrationAdminEventanalyticsController,
    EventregistrationEventorganizerEventanalyticsController,
  ],
})
export class MyModule {}
