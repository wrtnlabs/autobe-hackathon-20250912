import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsGroupProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsGroupProject";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Updates an existing group project by ID.
 *
 * Only the owner corporate learner may update.
 *
 * @param props - Parameters including corporateLearner: Authenticated corporate
 *   learner payload groupProjectId: UUID of the group project to update body:
 *   group project update data
 * @returns The updated group project
 * @throws Error if the group project does not exist or unauthorized
 */
export async function putenterpriseLmsCorporateLearnerGroupProjectsGroupProjectId(props: {
  corporateLearner: CorporatelearnerPayload;
  groupProjectId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsGroupProject.IUpdate;
}): Promise<IEnterpriseLmsGroupProject> {
  const { corporateLearner, groupProjectId, body } = props;
  const now = toISOStringSafe(new Date());

  const existing =
    await MyGlobal.prisma.enterprise_lms_group_projects.findUniqueOrThrow({
      where: { id: groupProjectId },
    });

  if (existing.owner_id !== corporateLearner.id) {
    throw new Error(
      "Unauthorized: Only the owner can update this group project",
    );
  }

  const updated = await MyGlobal.prisma.enterprise_lms_group_projects.update({
    where: { id: groupProjectId },
    data: {
      title: body.title,
      description: body.description ?? null,
      start_at: body.start_at,
      end_at: body.end_at,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    tenant_id: updated.tenant_id,
    owner_id: updated.owner_id,
    title: updated.title,
    description: updated.description ?? null,
    start_at: toISOStringSafe(updated.start_at),
    end_at: toISOStringSafe(updated.end_at),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
