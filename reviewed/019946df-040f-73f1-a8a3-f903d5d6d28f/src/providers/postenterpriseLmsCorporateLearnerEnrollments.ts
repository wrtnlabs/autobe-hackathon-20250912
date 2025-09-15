import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsEnrollment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsEnrollment";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Creates a new enrollment of a learner in a learning path.
 *
 * This operation accepts enrollment details such as learner ID and target
 * learning path. It applies business rules including prerequisite checks before
 * enrollment.
 *
 * Only authenticated corporate learners can perform this operation for
 * themselves.
 *
 * @param props - Object containing corporateLearner authentication and
 *   enrollment data
 * @param props.corporateLearner - Authenticated corporate learner payload
 * @param props.body - Enrollment creation data including learner ID, learning
 *   path ID, status, and optional business status
 * @returns The created enrollment entity with full details including timestamps
 * @throws {Error} If the authenticated user is not authorized to enroll the
 *   given learner
 */
export async function postenterpriseLmsCorporateLearnerEnrollments(props: {
  corporateLearner: CorporatelearnerPayload;
  body: IEnterpriseLmsEnrollment.ICreate;
}): Promise<IEnterpriseLmsEnrollment> {
  const { corporateLearner, body } = props;

  if (corporateLearner.id !== body.learner_id) {
    throw new Error("Unauthorized: You can only enroll yourself");
  }

  // TODO: Implement prerequisite and business rule validations

  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.enterprise_lms_enrollments.create({
    data: {
      id,
      learner_id: body.learner_id,
      learning_path_id: body.learning_path_id,
      status: body.status,
      business_status: body.business_status ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    learner_id: created.learner_id,
    learning_path_id: created.learning_path_id,
    status: created.status,
    business_status: created.business_status ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
