import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThread";
import { DepartmentmanagerPayload } from "../decorators/payload/DepartmentmanagerPayload";

/**
 * Create a new forum thread inside the specified forum.
 *
 * This operation is authorized for departmentManager users. It validates the
 * forum exists and belongs to the user's tenant. The thread is created with a
 * new UUID and current timestamps.
 *
 * @param props - Object containing the departmentManager payload, forumId path
 *   parameter, and the thread creation body.
 * @param props.departmentManager - Authenticated departmentManager information
 *   with id and type.
 * @param props.forumId - UUID of the forum where the thread will be created.
 * @param props.body - The forum thread creation payload conforming to
 *   IEnterpriseLmsForumThread.ICreate.
 * @returns The newly created IEnterpriseLmsForumThread entity with all fields.
 * @throws {Error} When the forum does not exist.
 * @throws {Error} When the departmentManager is not found or inactive.
 * @throws {Error} When the departmentManager tenant does not match the forum's
 *   tenant.
 */
export async function postenterpriseLmsDepartmentManagerForumsForumIdForumThreads(props: {
  departmentManager: DepartmentmanagerPayload;
  forumId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsForumThread.ICreate;
}): Promise<IEnterpriseLmsForumThread> {
  const { departmentManager, forumId, body } = props;

  // Verify that the forum exists and belongs to the department manager's tenant
  const forum = await MyGlobal.prisma.enterprise_lms_forums.findUnique({
    where: { id: forumId },
    select: { id: true, tenant_id: true },
  });
  if (!forum) throw new Error(`Forum not found: ${forumId}`);

  // Verify user's tenant matches forum's tenant and status is active
  const departmentManagerRecord =
    await MyGlobal.prisma.enterprise_lms_departmentmanager.findUnique({
      where: { id: departmentManager.id },
      select: { id: true, tenant_id: true, status: true, deleted_at: true },
    });
  if (!departmentManagerRecord)
    throw new Error(`Department manager not found: ${departmentManager.id}`);
  if (
    departmentManagerRecord.status !== "active" ||
    departmentManagerRecord.deleted_at !== null
  ) {
    throw new Error("Department manager is not active");
  }
  if (departmentManagerRecord.tenant_id !== forum.tenant_id) {
    throw new Error("Unauthorized: tenant mismatch");
  }

  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  // Create new forum thread
  const created = await MyGlobal.prisma.enterprise_lms_forum_threads.create({
    data: {
      id: id,
      forum_id: body.forum_id,
      author_id: body.author_id,
      title: body.title,
      body: body.body ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    forum_id: created.forum_id,
    author_id: created.author_id,
    title: created.title,
    body: created.body ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
