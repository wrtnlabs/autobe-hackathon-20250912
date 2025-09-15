import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Deletes a specific learning path permanently by its ID within tenant context.
 *
 * Enforces tenant-based authorization ensuring the corporate learner can only
 * delete learning paths within their own tenant organization.
 *
 * Performs a hard delete operation (non-soft delete).
 *
 * @param props - Method parameters including authorization and path parameter
 * @param props.corporateLearner - Authenticated corporate learner payload
 *   containing user ID
 * @param props.learningPathId - UUID of the learning path to be deleted
 * @throws {Error} Throws error if learning path is not found (404)
 * @throws {Error} Throws error if tenant ownership validation fails (403)
 */
export async function deleteenterpriseLmsCorporateLearnerLearningPathsLearningPathId(props: {
  corporateLearner: CorporatelearnerPayload;
  learningPathId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Fetch tenant info of the corporate learner to verify tenant ownership
  const corporateLearnerRecord =
    await MyGlobal.prisma.enterprise_lms_corporatelearner.findUniqueOrThrow({
      where: { id: props.corporateLearner.id },
      select: { tenant_id: true },
    });

  // Fetch the learning path to verify existence and tenant ownership
  const learningPath =
    await MyGlobal.prisma.enterprise_lms_learning_paths.findUniqueOrThrow({
      where: { id: props.learningPathId },
      select: { tenant_id: true },
    });

  // Check tenant ownership to enforce tenant isolation
  if (learningPath.tenant_id !== corporateLearnerRecord.tenant_id) {
    throw new Error("Unauthorized: Tenant mismatch");
  }

  // Perform hard delete as specified
  await MyGlobal.prisma.enterprise_lms_learning_paths.delete({
    where: { id: props.learningPathId },
  });
}
