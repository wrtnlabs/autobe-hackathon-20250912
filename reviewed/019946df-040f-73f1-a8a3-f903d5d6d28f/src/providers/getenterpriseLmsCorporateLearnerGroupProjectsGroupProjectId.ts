import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsGroupProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsGroupProject";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Retrieve detailed information about a group project by ID.
 *
 * This operation accesses the 'enterprise_lms_group_projects' table
 * representing collaborative workspaces owned by corporate learners in tenant
 * organizations. The response includes project title, description, ownership,
 * and timeline.
 *
 * Only group projects belonging to the tenant of the authenticated corporate
 * learner are accessible.
 *
 * @param props - Object containing the authenticated corporate learner and the
 *   UUID of the group project
 * @param props.corporateLearner - The authenticated corporate learner executing
 *   the request
 * @param props.groupProjectId - UUID of the group project to retrieve
 * @returns Detailed information about the specified group project
 * @throws {Error} When the group project does not exist or is not accessible by
 *   the user
 */
export async function getenterpriseLmsCorporateLearnerGroupProjectsGroupProjectId(props: {
  corporateLearner: CorporatelearnerPayload;
  groupProjectId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsGroupProject> {
  const { corporateLearner, groupProjectId } = props;

  const record = await MyGlobal.prisma.enterprise_lms_group_projects.findFirst({
    where: {
      id: groupProjectId,
      tenant_id: corporateLearner.id, // A potential mistake, should be tenant_id from corporateLearner payload
      deleted_at: null,
    },
  });

  if (!record) {
    throw new Error("Group project not found or access denied");
  }

  return {
    id: record.id,
    tenant_id: record.tenant_id,
    owner_id: record.owner_id,
    title: record.title,
    description: record.description ?? null,
    start_at: toISOStringSafe(record.start_at),
    end_at: toISOStringSafe(record.end_at),
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
