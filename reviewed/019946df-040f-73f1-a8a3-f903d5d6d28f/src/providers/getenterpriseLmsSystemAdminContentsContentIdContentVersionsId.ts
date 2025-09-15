import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsContentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentVersion";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve detailed information about a content version by ID.
 *
 * This function fetches a specific historical snapshot of a content version
 * identified by its UUID `id` under a parent content entity identified by
 * `contentId`. It ensures that the record exists, belongs to the specified
 * content, and returns all metadata necessary for audit, compliance, and
 * rollback scenarios.
 *
 * Authorization must be enforced via the provided `systemAdmin` payload, which
 * is expected to be validated by authentication middleware or decorators.
 *
 * @param props - An object containing:
 *
 *   - SystemAdmin: The authenticated system administrator payload.
 *   - ContentId: The UUID of the content owning the version.
 *   - Id: The UUID of the content version to retrieve.
 *
 * @returns The full content version entity as per IEnterpriseLmsContentVersion
 *   interface.
 * @throws {Error} Throws if the content version is not found under the given
 *   content.
 */
export async function getenterpriseLmsSystemAdminContentsContentIdContentVersionsId(props: {
  systemAdmin: SystemadminPayload;
  contentId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsContentVersion> {
  const found =
    await MyGlobal.prisma.enterprise_lms_content_versions.findFirstOrThrow({
      where: {
        id: props.id,
        content_id: props.contentId,
      },
      select: {
        id: true,
        content_id: true,
        version_number: true,
        title: true,
        description: true,
        content_type: true,
        status: true,
        business_status: true,
        created_at: true,
      },
    });

  return {
    id: found.id,
    content_id: found.content_id,
    version_number: found.version_number,
    title: found.title,
    description: found.description ?? null,
    content_type: found.content_type,
    status: found.status,
    business_status: found.business_status,
    created_at: toISOStringSafe(found.created_at),
  };
}
