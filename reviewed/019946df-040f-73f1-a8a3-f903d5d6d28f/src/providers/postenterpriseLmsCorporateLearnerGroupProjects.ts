import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsGroupProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsGroupProject";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Creates a new group project for collaborative workspaces within the
 * Enterprise LMS.
 *
 * This operation requires an authenticated corporateLearner user. The client
 * supplies tenant ID, owner ID, title, optional description, start and end
 * timestamps. The system generates a unique UUID for the group project and
 * manages creation and update timestamps.
 *
 * @param props - An object containing the corporateLearner payload and group
 *   project creation body.
 * @param props.corporateLearner - The authenticated corporateLearner user.
 * @param props.body - The data to create a new group project in the system.
 * @returns The newly created group project entity matching the
 *   IEnterpriseLmsGroupProject interface.
 * @throws {Error} Throws if the creation in the database fails.
 */
export async function postenterpriseLmsCorporateLearnerGroupProjects(props: {
  corporateLearner: import("../../decorators/payload/CorporatelearnerPayload").CorporatelearnerPayload;

  body: IEnterpriseLmsGroupProject.ICreate;
}): Promise<IEnterpriseLmsGroupProject> {
  const { corporateLearner, body } = props;
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.enterprise_lms_group_projects.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      tenant_id: body.tenant_id,
      owner_id: body.owner_id,
      title: body.title,
      description: body.description ?? null,
      start_at: body.start_at,
      end_at: body.end_at,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    tenant_id: created.tenant_id as string & tags.Format<"uuid">,
    owner_id: created.owner_id as string & tags.Format<"uuid">,
    title: created.title,
    description: created.description ?? null,
    start_at: created.start_at as string & tags.Format<"date-time">,
    end_at: created.end_at as string & tags.Format<"date-time">,
    created_at: created.created_at as string & tags.Format<"date-time">,
    updated_at: created.updated_at as string & tags.Format<"date-time">,
    deleted_at: null,
  };
}
