import { Module } from "@nestjs/common";

import { AuthMemberJoinController } from "./controllers/auth/member/join/AuthMemberJoinController";
import { AuthMemberLoginController } from "./controllers/auth/member/login/AuthMemberLoginController";
import { AuthMemberRefreshController } from "./controllers/auth/member/refresh/AuthMemberRefreshController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { ChatbotAdminChatbotroomtuplesController } from "./controllers/chatbot/admin/chatbotRoomTuples/ChatbotAdminChatbotroomtuplesController";
import { ChatbotAdminChatbotadminsController } from "./controllers/chatbot/admin/chatbotAdmins/ChatbotAdminChatbotadminsController";
import { ChatbotAdminChatbotmembersController } from "./controllers/chatbot/admin/chatbotMembers/ChatbotAdminChatbotmembersController";
import { ChatbotMemberChatbotmembersController } from "./controllers/chatbot/member/chatbotMembers/ChatbotMemberChatbotmembersController";
import { ChatbotAdminChatbotpointsController } from "./controllers/chatbot/admin/chatbotPoints/ChatbotAdminChatbotpointsController";
import { ChatbotMemberChatbotpointsController } from "./controllers/chatbot/member/chatbotPoints/ChatbotMemberChatbotpointsController";
import { ChatbotMemberChatbotpointcooldownsController } from "./controllers/chatbot/member/chatbotPointCooldowns/ChatbotMemberChatbotpointcooldownsController";
import { ChatbotAdminChatbotpointcooldownsController } from "./controllers/chatbot/admin/chatbotPointCooldowns/ChatbotAdminChatbotpointcooldownsController";
import { ChatbotAdminTitlesController } from "./controllers/chatbot/admin/titles/ChatbotAdminTitlesController";
import { ChatbotTitlesController } from "./controllers/chatbot/titles/ChatbotTitlesController";
import { ChatbotMemberChatbotmembersUsertitlesController } from "./controllers/chatbot/member/chatbotMembers/userTitles/ChatbotMemberChatbotmembersUsertitlesController";
import { ChatbotStockitemsController } from "./controllers/chatbot/stockItems/ChatbotStockitemsController";
import { ChatbotAdminStockitemsController } from "./controllers/chatbot/admin/stockItems/ChatbotAdminStockitemsController";
import { ChatbotMemberChatbotmembersStockholdingsController } from "./controllers/chatbot/member/chatbotMembers/stockHoldings/ChatbotMemberChatbotmembersStockholdingsController";
import { ChatbotMemberChatbotmembersStocktransactionsController } from "./controllers/chatbot/member/chatbotMembers/stockTransactions/ChatbotMemberChatbotmembersStocktransactionsController";
import { ChatbotStockpricesnapshotsController } from "./controllers/chatbot/stockPriceSnapshots/ChatbotStockpricesnapshotsController";
import { ChatbotAdminStockpriceupdatesController } from "./controllers/chatbot/admin/stockPriceUpdates/ChatbotAdminStockpriceupdatesController";
import { ChatbotMemberSlotmachinePlaysController } from "./controllers/chatbot/member/slotmachine/plays/ChatbotMemberSlotmachinePlaysController";
import { ChatbotAdminChatbotcommandlogsController } from "./controllers/chatbot/admin/chatbotCommandLogs/ChatbotAdminChatbotcommandlogsController";
import { ChatbotMemberChatbotcommandlogsController } from "./controllers/chatbot/member/chatbotCommandLogs/ChatbotMemberChatbotcommandlogsController";
import { ChatbotAdminAuditlogsController } from "./controllers/chatbot/admin/auditLogs/ChatbotAdminAuditlogsController";

@Module({
  controllers: [
    AuthMemberJoinController,
    AuthMemberLoginController,
    AuthMemberRefreshController,
    AuthAdminController,
    ChatbotAdminChatbotroomtuplesController,
    ChatbotAdminChatbotadminsController,
    ChatbotAdminChatbotmembersController,
    ChatbotMemberChatbotmembersController,
    ChatbotAdminChatbotpointsController,
    ChatbotMemberChatbotpointsController,
    ChatbotMemberChatbotpointcooldownsController,
    ChatbotAdminChatbotpointcooldownsController,
    ChatbotAdminTitlesController,
    ChatbotTitlesController,
    ChatbotMemberChatbotmembersUsertitlesController,
    ChatbotStockitemsController,
    ChatbotAdminStockitemsController,
    ChatbotMemberChatbotmembersStockholdingsController,
    ChatbotMemberChatbotmembersStocktransactionsController,
    ChatbotStockpricesnapshotsController,
    ChatbotAdminStockpriceupdatesController,
    ChatbotMemberSlotmachinePlaysController,
    ChatbotAdminChatbotcommandlogsController,
    ChatbotMemberChatbotcommandlogsController,
    ChatbotAdminAuditlogsController,
  ],
})
export class MyModule {}
