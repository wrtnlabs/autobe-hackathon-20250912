import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotAdmin";
import type { IChatbotChatbotAuditLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotChatbotAuditLogs";
import type { IChatbotMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotMember";
import type { IChatbotRoomTuples } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotRoomTuples";

export async function test_api_chatbot_audit_log_retrieve_detail_by_id_with_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Create and authenticate first admin user via /auth/admin/join
  const adminInternalSenderId = RandomGenerator.alphaNumeric(16);
  const adminNickname = RandomGenerator.name();
  const admin: IChatbotAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        internal_sender_id: adminInternalSenderId,
        nickname: adminNickname,
      } satisfies IChatbotAdmin.ICreate,
    },
  );
  typia.assert(admin);

  // 2. Create chatbot room tuple required for audit logs
  const roomTupleCreateBody = {
    normal_room_id: RandomGenerator.alphaNumeric(12),
    admin_room_id: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    unique_id: RandomGenerator.alphaNumeric(16),
    enabled: true,
  } satisfies IChatbotRoomTuples.ICreate;

  const roomTuple: IChatbotRoomTuples =
    await api.functional.chatbot.admin.chatbotRoomTuples.create(connection, {
      body: roomTupleCreateBody,
    });
  typia.assert(roomTuple);

  // 3. Create chatbot member required for audit logs
  const memberCreateBody = {
    internal_sender_id: RandomGenerator.alphaNumeric(16),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotMember.ICreate;

  const member: IChatbotMember =
    await api.functional.chatbot.member.chatbotMembers.create(connection, {
      body: memberCreateBody,
    });
  typia.assert(member);

  // Since no direct API for audit log creation is given, simulate audit log record creation
  // Prepare audit log object using created member and room tuple IDs
  const auditLog: IChatbotChatbotAuditLogs = {
    id: typia.random<string & tags.Format<"uuid">>(),
    chatbot_member_id: member.id,
    chatbot_room_tuple_id: roomTuple.id,
    event_type: "command_execution",
    event_payload: JSON.stringify({ command: "/help", success: true }),
    created_at: new Date().toISOString(),
  };
  typia.assert(auditLog);

  // 4. Admin attempts to retrieve audit log details by auditLog.id
  const retrieved: IChatbotChatbotAuditLogs =
    await api.functional.chatbot.admin.auditLogs.at(connection, {
      auditLogId: auditLog.id,
    });
  typia.assert(retrieved);

  // Validate audit log details correctness
  TestValidator.equals("audit log id matches", retrieved.id, auditLog.id);
  TestValidator.equals(
    "chatbot member id matches",
    retrieved.chatbot_member_id,
    auditLog.chatbot_member_id ?? null,
  );
  TestValidator.equals(
    "chatbot room tuple id matches",
    retrieved.chatbot_room_tuple_id,
    auditLog.chatbot_room_tuple_id ?? null,
  );
  TestValidator.equals(
    "event type matches",
    retrieved.event_type,
    auditLog.event_type,
  );
  TestValidator.equals(
    "event payload matches",
    retrieved.event_payload,
    auditLog.event_payload,
  );
  TestValidator.equals(
    "created at matches",
    retrieved.created_at,
    auditLog.created_at,
  );

  // 5. Negative test: try fetching audit log with non-existent UUID
  await TestValidator.error("non-existent audit log should fail", async () => {
    await api.functional.chatbot.admin.auditLogs.at(connection, {
      auditLogId: "00000000-0000-0000-0000-000000000000" as string &
        tags.Format<"uuid">,
    });
  });

  // 6. Negative test: try fetching audit log with invalid UUID format
  await TestValidator.error("invalid UUID format should fail", async () => {
    await api.functional.chatbot.admin.auditLogs.at(connection, {
      auditLogId: "invalid-uuid-format",
    });
  });

  // 7. Negative test: try fetching audit log without admin authentication
  // Simulate unauthenticated connection by cloning and clearing headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthorized access without admin auth should fail",
    async () => {
      await api.functional.chatbot.admin.auditLogs.at(
        unauthenticatedConnection,
        {
          auditLogId: auditLog.id,
        },
      );
    },
  );

  // 8. Additional auth tests: attempt retrieval using member authentication
  // Create and authenticate a member user
  const memberLoginBody = {
    internal_sender_id: memberCreateBody.internal_sender_id,
    nickname: memberCreateBody.nickname,
  } satisfies IChatbotMember.ILogin;

  const memberLogin: IChatbotMember.IAuthorized =
    await api.functional.auth.member.login.loginMember(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLogin);

  // Try to retrieve audit log as member (not admin) - should fail
  await TestValidator.error(
    "member role access to admin audit log should fail",
    async () => {
      await api.functional.chatbot.admin.auditLogs.at(connection, {
        auditLogId: auditLog.id,
      });
    },
  );

  // 9. Switch back to admin authentication and ensure retrieval succeeds
  const adminLoginBody = {
    internal_sender_id: adminInternalSenderId,
    nickname: adminNickname,
  } satisfies IChatbotAdmin.ILogin;

  const adminLogin: IChatbotAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  const retrievalAfterSwitch: IChatbotChatbotAuditLogs =
    await api.functional.chatbot.admin.auditLogs.at(connection, {
      auditLogId: auditLog.id,
    });
  typia.assert(retrievalAfterSwitch);
  TestValidator.equals(
    "retrieval after auth switch matches",
    retrievalAfterSwitch.id,
    auditLog.id,
  );
}
