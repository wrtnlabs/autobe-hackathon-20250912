import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsLearningPaths } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsLearningPaths";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Creates a new learning path entity within the Enterprise LMS system.
 *
 * This operation creates a new learning path associated with a tenant
 * organization, enforcing unique code per tenant and required business rules.
 *
 * Authorization is required: only corporate learner role can perform this.
 *
 * @param props - Object containing the authenticated corporate learner and
 *   creation data
 * @param props.corporateLearner - Authenticated corporate learner payload
 * @param props.body - Learning path creation data complying with
 *   IEnterpriseLmsLearningPaths.ICreate
 * @returns The full learning path entity after creation
 * @throws {Error} When creation fails due to duplicate code or other database
 *   constraints
 */
export async function postenterpriseLmsCorporateLearnerLearningPaths(props: {
  corporateLearner: CorporatelearnerPayload;
  body: IEnterpriseLmsLearningPaths.ICreate;
}): Promise<IEnterpriseLmsLearningPaths> {
  const id: string & tags.Format<"uuid"> = v4() as string & tags.Format<"uuid">;
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.enterprise_lms_learning_paths.create({
    data: {
      id,
      tenant_id: props.body.tenant_id,
      code: props.body.code,
      title: props.body.title,
      description: props.body.description ?? null,
      status: props.body.status,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    tenant_id: created.tenant_id,
    code: created.code,
    title: created.title,
    description: created.description ?? null,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
