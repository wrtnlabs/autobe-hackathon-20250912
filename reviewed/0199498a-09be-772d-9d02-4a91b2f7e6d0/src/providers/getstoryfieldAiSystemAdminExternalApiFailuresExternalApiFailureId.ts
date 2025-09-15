import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiExternalApiFailure } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiExternalApiFailure";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve detail of a specific external API failure event from
 * storyfield_ai_external_api_failures.
 *
 * This endpoint allows system administrators to fetch the complete metadata and
 * error context for a given external API failure or integration error event, as
 * persisted in the storyfield_ai_external_api_failures table. All sensitive and
 * audit fields are included, enabling postmortem, incident review, and
 * compliance reporting. SystemAdmin authorization is required; event must exist
 * and must not be soft-deleted.
 *
 * @param props - Object containing systemAdmin authentication and the
 *   externalApiFailureId path parameter
 * @param props.systemAdmin - The authenticated system admin payload
 * @param props.externalApiFailureId - The UUID referencing the specific
 *   external API failure event to fetch
 * @returns Detailed information for the target external API failure log entry
 * @throws {Error} If the event does not exist or has been soft-deleted
 */
export async function getstoryfieldAiSystemAdminExternalApiFailuresExternalApiFailureId(props: {
  systemAdmin: SystemadminPayload;
  externalApiFailureId: string & tags.Format<"uuid">;
}): Promise<IStoryfieldAiExternalApiFailure> {
  const failure =
    await MyGlobal.prisma.storyfield_ai_external_api_failures.findFirst({
      where: {
        id: props.externalApiFailureId,
        deleted_at: null,
      },
    });
  if (!failure) throw new Error("External API failure event not found");
  return {
    id: failure.id,
    storyfield_ai_authenticateduser_id:
      failure.storyfield_ai_authenticateduser_id ?? undefined,
    storyfield_ai_story_id: failure.storyfield_ai_story_id ?? undefined,
    api_type: failure.api_type,
    endpoint: failure.endpoint,
    http_method: failure.http_method,
    error_code: failure.error_code,
    error_message: failure.error_message ?? undefined,
    request_payload: failure.request_payload ?? undefined,
    response_payload: failure.response_payload ?? undefined,
    retry_count: failure.retry_count,
    session_id: failure.session_id ?? undefined,
    created_at: toISOStringSafe(failure.created_at),
    updated_at: toISOStringSafe(failure.updated_at),
    deleted_at:
      failure.deleted_at !== null && failure.deleted_at !== undefined
        ? toISOStringSafe(failure.deleted_at)
        : undefined,
  };
}
