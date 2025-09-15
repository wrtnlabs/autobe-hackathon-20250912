import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsForum } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForum";

/**
 * Retrieve detailed forum information by its unique identifier.
 *
 * This public endpoint fetches a single forum record from the
 * enterprise_lms_forums table. It returns all forum properties including
 * tenant, owner, name, descriptions, and audit timestamps.
 *
 * @param props - Request parameters
 * @param props.forumId - Unique UUID of the forum to retrieve
 * @returns The detailed forum entity
 * @throws {Error} If the forum with the provided ID does not exist
 */
export async function getenterpriseLmsForumsForumId(props: {
  forumId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsForum> {
  const { forumId } = props;
  const forum = await MyGlobal.prisma.enterprise_lms_forums.findUniqueOrThrow({
    where: { id: forumId },
    select: {
      id: true,
      tenant_id: true,
      owner_id: true,
      name: true,
      description: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  return {
    id: forum.id,
    tenant_id: forum.tenant_id,
    owner_id: forum.owner_id,
    name: forum.name,
    description: forum.description ?? null,
    created_at: toISOStringSafe(forum.created_at),
    updated_at: toISOStringSafe(forum.updated_at),
    deleted_at: forum.deleted_at ? toISOStringSafe(forum.deleted_at) : null,
  };
}
