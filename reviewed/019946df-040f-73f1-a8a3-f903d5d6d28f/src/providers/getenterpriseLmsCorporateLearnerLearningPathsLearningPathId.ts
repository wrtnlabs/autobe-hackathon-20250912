import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsLearningPaths } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsLearningPaths";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Retrieves detailed information of a specific Learning Path entity for a
 * corporate learner.
 *
 * This function ensures tenant isolation by verifying the corporate learner's
 * active status and tenant affiliation before fetching the learning path. It
 * returns comprehensive metadata including identifiers, lifecycle status,
 * descriptive fields, and timestamps.
 *
 * @param props - Object containing corporate learner payload and learning path
 *   ID
 * @param props.corporateLearner - Authenticated corporate learner's payload
 *   with user ID
 * @param props.learningPathId - UUID of the requested learning path
 * @returns Detailed learning path information conforming to
 *   IEnterpriseLmsLearningPaths
 * @throws {Error} When the learner is inactive or soft deleted
 * @throws {Error} When the learning path is not found or inaccessible
 */
export async function getenterpriseLmsCorporateLearnerLearningPathsLearningPathId(props: {
  corporateLearner: CorporatelearnerPayload;
  learningPathId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsLearningPaths> {
  const { corporateLearner, learningPathId } = props;

  // Retrieve corporate learner with tenant_id for authorization and status validation
  const learner =
    await MyGlobal.prisma.enterprise_lms_corporatelearner.findUniqueOrThrow({
      where: { id: corporateLearner.id },
      select: { id: true, tenant_id: true, status: true, deleted_at: true },
    });

  // Validate learner's active status and non-deletion
  if (learner.status !== "active" || learner.deleted_at !== null) {
    throw new Error("Unauthorized: inactive or deleted learner");
  }

  // Find learning path matching the learner's tenant and learning path ID, excluding soft deleted
  const learningPath =
    await MyGlobal.prisma.enterprise_lms_learning_paths.findFirst({
      where: {
        id: learningPathId,
        tenant_id: learner.tenant_id,
        deleted_at: null,
      },
      select: {
        id: true,
        tenant_id: true,
        code: true,
        title: true,
        description: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  if (!learningPath) {
    throw new Error("Learning Path not found or access denied");
  }

  // Return learning path data with correct ISO date string conversions
  return {
    id: learningPath.id,
    tenant_id: learningPath.tenant_id,
    code: learningPath.code,
    title: learningPath.title,
    description: learningPath.description ?? null,
    status: learningPath.status,
    created_at: toISOStringSafe(learningPath.created_at),
    updated_at: toISOStringSafe(learningPath.updated_at),
    deleted_at: learningPath.deleted_at
      ? toISOStringSafe(learningPath.deleted_at)
      : null,
  };
}
