import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsEnrollment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsEnrollment";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Retrieve detailed information about a specific enrollment
 *
 * This endpoint fetches enrollment details by ID for a corporate learner. It
 * enforces access control by ensuring the requesting user is the enrolled
 * learner.
 *
 * @param props - Object containing corporateLearner and enrollment ID
 * @param props.corporateLearner - Authenticated corporate learner payload
 * @param props.id - UUID of the enrollment to retrieve
 * @returns Enrollment details conforming to IEnterpriseLmsEnrollment
 * @throws {Error} When the enrollment does not exist or user is unauthorized
 */
export async function getenterpriseLmsCorporateLearnerEnrollmentsId(props: {
  corporateLearner: CorporatelearnerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsEnrollment> {
  const { corporateLearner, id } = props;

  // Fetch enrollment with learner relation
  const enrollment =
    await MyGlobal.prisma.enterprise_lms_enrollments.findUniqueOrThrow({
      where: { id },
      include: { learner: true },
    });

  // Authorization check: ensure enrollment belongs to authenticated learner
  if (enrollment.learner_id !== corporateLearner.id) {
    throw new Error("Unauthorized access to enrollment");
  }

  return {
    id: enrollment.id,
    learner_id: enrollment.learner_id,
    learning_path_id: enrollment.learning_path_id,
    status: enrollment.status,
    business_status: enrollment.business_status ?? undefined,
    created_at: toISOStringSafe(enrollment.created_at),
    updated_at: toISOStringSafe(enrollment.updated_at),
    deleted_at: enrollment.deleted_at
      ? toISOStringSafe(enrollment.deleted_at)
      : null,
  };
}
