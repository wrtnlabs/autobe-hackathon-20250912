import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsContentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentVersion";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve detailed information about a specific content version by ID
 *
 * This function fetches a historical snapshot of content metadata from the
 * enterprise_lms_content_versions table, identified by content UUID and version
 * UUID. It is used for audit, compliance, and rollback in the Enterprise LMS.
 *
 * @param props - Input parameters containing organizationAdmin payload and
 *   identifiers
 * @param props.organizationAdmin - The authorized organization admin payload
 * @param props.contentId - UUID of the parent content
 * @param props.id - UUID of the content version
 * @returns Detailed content version information conforming to
 *   IEnterpriseLmsContentVersion
 * @throws {Error} If the content version is not found, throws an error
 */
export async function getenterpriseLmsOrganizationAdminContentsContentIdContentVersionsId(props: {
  organizationAdmin: OrganizationadminPayload;
  contentId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsContentVersion> {
  const { contentId, id } = props;

  const contentVersion =
    await MyGlobal.prisma.enterprise_lms_content_versions.findFirstOrThrow({
      where: {
        id,
        content_id: contentId,
      },
    });

  return {
    id: contentVersion.id,
    content_id: contentVersion.content_id,
    version_number: contentVersion.version_number,
    title: contentVersion.title,
    description: contentVersion.description ?? null,
    content_type: contentVersion.content_type,
    status: contentVersion.status,
    business_status: contentVersion.business_status,
    created_at: toISOStringSafe(contentVersion.created_at),
  };
}
