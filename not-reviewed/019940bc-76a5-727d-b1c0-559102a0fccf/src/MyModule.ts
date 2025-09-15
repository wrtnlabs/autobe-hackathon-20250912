import { Module } from "@nestjs/common";

import { AuthGuestJoinController } from "./controllers/auth/guest/join/AuthGuestJoinController";
import { AuthGuestRefreshController } from "./controllers/auth/guest/refresh/AuthGuestRefreshController";
import { AuthMemberController } from "./controllers/auth/member/AuthMemberController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { AuctionplatformAdminAuctionplatformapiintegrationsController } from "./controllers/auctionPlatform/admin/auctionPlatformApiIntegrations/AuctionplatformAdminAuctionplatformapiintegrationsController";
import { AuctionplatformAdminAuctionplatformratelimitsController } from "./controllers/auctionPlatform/admin/auctionPlatformRateLimits/AuctionplatformAdminAuctionplatformratelimitsController";
import { AuctionplatformAdminAuctionplatformauditlogsController } from "./controllers/auctionPlatform/admin/auctionPlatformAuditLogs/AuctionplatformAdminAuctionplatformauditlogsController";
import { AuctionplatformAdminGuestsController } from "./controllers/auctionPlatform/admin/guests/AuctionplatformAdminGuestsController";
import { AuctionplatformMemberMembersController } from "./controllers/auctionPlatform/member/members/AuctionplatformMemberMembersController";
import { AuctionplatformAdminAdminsController } from "./controllers/auctionPlatform/admin/admins/AuctionplatformAdminAdminsController";
import { AuctionplatformAdminAuctionroomsController } from "./controllers/auctionPlatform/admin/auctionRooms/AuctionplatformAdminAuctionroomsController";
import { AuctionplatformMemberAuctioncandidatesController } from "./controllers/auctionPlatform/member/auctionCandidates/AuctionplatformMemberAuctioncandidatesController";
import { AuctionplatformAdminAuctioncandidatesController } from "./controllers/auctionPlatform/admin/auctionCandidates/AuctionplatformAdminAuctioncandidatesController";
import { AuctionplatformMemberTeamleadersController } from "./controllers/auctionPlatform/member/teamLeaders/AuctionplatformMemberTeamleadersController";
import { AuctionplatformAdminTeamleadersController } from "./controllers/auctionPlatform/admin/teamLeaders/AuctionplatformAdminTeamleadersController";
import { AuctionplatformMemberBidsController } from "./controllers/auctionPlatform/member/bids/AuctionplatformMemberBidsController";
import { AuctionplatformAdminPointbalancesController } from "./controllers/auctionPlatform/admin/pointBalances/AuctionplatformAdminPointbalancesController";
import { AuctionplatformMemberPointbalancesController } from "./controllers/auctionPlatform/member/pointBalances/AuctionplatformMemberPointbalancesController";
import { AuctionplatformMemberChatMessagesController } from "./controllers/auctionPlatform/member/chat/messages/AuctionplatformMemberChatMessagesController";
import { AuctionplatformAdminChatMessagesController } from "./controllers/auctionPlatform/admin/chat/messages/AuctionplatformAdminChatMessagesController";
import { AuctionplatformAdminSponsorshipeventsController } from "./controllers/auctionPlatform/admin/sponsorshipEvents/AuctionplatformAdminSponsorshipeventsController";
import { AuctionplatformAdminSponsorshipanimationsController } from "./controllers/auctionPlatform/admin/sponsorshipAnimations/AuctionplatformAdminSponsorshipanimationsController";
import { AuctionplatformMemberCalendareventsController } from "./controllers/auctionPlatform/member/calendarEvents/AuctionplatformMemberCalendareventsController";
import { AuctionplatformAdminCalendareventsController } from "./controllers/auctionPlatform/admin/calendarEvents/AuctionplatformAdminCalendareventsController";
import { AuctionplatformAdminCalendareventsScheduleauditlogsController } from "./controllers/auctionPlatform/admin/calendarEvents/scheduleAuditLogs/AuctionplatformAdminCalendareventsScheduleauditlogsController";
import { AuctionplatformIconpurchasesController } from "./controllers/auctionPlatform/iconPurchases/AuctionplatformIconpurchasesController";
import { AuctionplatformMemberIconpurchasesController } from "./controllers/auctionPlatform/member/iconPurchases/AuctionplatformMemberIconpurchasesController";

@Module({
  controllers: [
    AuthGuestJoinController,
    AuthGuestRefreshController,
    AuthMemberController,
    AuthAdminController,
    AuctionplatformAdminAuctionplatformapiintegrationsController,
    AuctionplatformAdminAuctionplatformratelimitsController,
    AuctionplatformAdminAuctionplatformauditlogsController,
    AuctionplatformAdminGuestsController,
    AuctionplatformMemberMembersController,
    AuctionplatformAdminAdminsController,
    AuctionplatformAdminAuctionroomsController,
    AuctionplatformMemberAuctioncandidatesController,
    AuctionplatformAdminAuctioncandidatesController,
    AuctionplatformMemberTeamleadersController,
    AuctionplatformAdminTeamleadersController,
    AuctionplatformMemberBidsController,
    AuctionplatformAdminPointbalancesController,
    AuctionplatformMemberPointbalancesController,
    AuctionplatformMemberChatMessagesController,
    AuctionplatformAdminChatMessagesController,
    AuctionplatformAdminSponsorshipeventsController,
    AuctionplatformAdminSponsorshipanimationsController,
    AuctionplatformMemberCalendareventsController,
    AuctionplatformAdminCalendareventsController,
    AuctionplatformAdminCalendareventsScheduleauditlogsController,
    AuctionplatformIconpurchasesController,
    AuctionplatformMemberIconpurchasesController,
  ],
})
export class MyModule {}
