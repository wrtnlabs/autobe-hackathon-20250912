import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotMember";
import type { IChatbotPoints } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotPoints";

export async function test_api_chatbot_points_creation_by_member(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a chatbot member.
  const memberCreateBody = {
    internal_sender_id: RandomGenerator.alphaNumeric(10),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotMember.ICreate;

  const member: IChatbotMember.IAuthorized =
    await api.functional.auth.member.join.joinMember(connection, {
      body: memberCreateBody,
    });
  typia.assert(member);

  // 2. Create chatbot points record using the authenticated member's ID
  const pointsCreateBody = {
    chatbot_member_id: member.id,
    points: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  } satisfies IChatbotPoints.ICreate;

  const chatbotPoints: IChatbotPoints =
    await api.functional.chatbot.member.chatbotPoints.create(connection, {
      body: pointsCreateBody,
    });
  typia.assert(chatbotPoints);

  // 3. Validate the created chatbot points record
  TestValidator.equals(
    "chatbot points belongs to created member",
    chatbotPoints.chatbot_member_id,
    member.id,
  );
  TestValidator.equals(
    "chatbot points matches created points",
    chatbotPoints.points,
    pointsCreateBody.points,
  );
  TestValidator.predicate(
    "chatbot points has valid UUID",
    typeof chatbotPoints.id === "string" && chatbotPoints.id.length > 0,
  );
  TestValidator.predicate(
    "chatbot points created_at present",
    typeof chatbotPoints.created_at === "string" &&
      chatbotPoints.created_at.length > 0,
  );
  TestValidator.predicate(
    "chatbot points updated_at present",
    typeof chatbotPoints.updated_at === "string" &&
      chatbotPoints.updated_at.length > 0,
  );
}
