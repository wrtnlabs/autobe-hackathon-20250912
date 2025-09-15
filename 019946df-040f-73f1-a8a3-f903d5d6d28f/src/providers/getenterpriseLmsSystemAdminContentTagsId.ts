import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsContentTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentTag";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Get details of a specific content tag.
 *
 * Retrieves detailed information about a content tag identified by its unique
 * UUID. Access is restricted to authenticated system administrators.
 *
 * @param props - Request properties
 * @param props.systemAdmin - Authenticated system administrator payload
 * @param props.id - UUID of the content tag to retrieve
 * @returns Detailed content tag entity conforming to IEnterpriseLmsContentTag
 * @throws {Error} Throws if the content tag does not exist or has been soft
 *   deleted
 */
export async function getenterpriseLmsSystemAdminContentTagsId(props: {
  systemAdmin: SystemadminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsContentTag> {
  const { id } = props;

  const tag =
    await MyGlobal.prisma.enterprise_lms_content_tags.findFirstOrThrow({
      where: {
        id,
        deleted_at: null,
      },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
      },
    });

  return {
    id: tag.id,
    code: tag.code,
    name: tag.name,
    description: tag.description ?? null,
  };
}
