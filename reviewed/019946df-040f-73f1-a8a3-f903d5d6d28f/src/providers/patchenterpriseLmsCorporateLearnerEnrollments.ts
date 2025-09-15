import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsEnrollment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsEnrollment";
import { IPageIEnterpriseLmsEnrollment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsEnrollment";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Search and retrieve a list of learner enrollments with filtering and
 * pagination.
 *
 * Retrieves learner enrollments for the authenticated corporate learner's
 * tenant. Supports filtering by learner ID, learning path ID, status, and
 * business status. Applies pagination and sorting criteria.
 *
 * @param props - The request properties including corporateLearner and
 *   filtering body
 * @param props.corporateLearner - Authenticated corporate learner user with id
 * @param props.body - Filter and pagination criteria for enrollments
 * @returns A paginated summary of learner enrollments matching the filters
 * @throws {Error} - Throws if any query fails or input is invalid
 */
export async function patchenterpriseLmsCorporateLearnerEnrollments(props: {
  corporateLearner: CorporatelearnerPayload;
  body: IEnterpriseLmsEnrollment.IRequest;
}): Promise<IPageIEnterpriseLmsEnrollment.ISummary> {
  const { corporateLearner, body } = props;

  // Fetch tenant_id for the authenticated corporate learner
  const corporateLearnerRecord =
    await MyGlobal.prisma.enterprise_lms_corporatelearner.findUniqueOrThrow({
      where: { id: corporateLearner.id },
      select: { tenant_id: true },
    });

  // Build where clause scoped by tenant and soft deletion
  const where: {
    deleted_at: null;
    learner: { tenant_id: string & tags.Format<"uuid"> };
    learner_id?: string & tags.Format<"uuid">;
    learning_path_id?: string & tags.Format<"uuid">;
    status?: string;
    business_status?: string | null;
  } = {
    deleted_at: null,
    learner: { tenant_id: corporateLearnerRecord.tenant_id },
  };

  if (body.learner_id !== undefined && body.learner_id !== null) {
    where.learner_id = body.learner_id;
  }

  if (body.learning_path_id !== undefined && body.learning_path_id !== null) {
    where.learning_path_id = body.learning_path_id;
  }

  if (body.status !== undefined && body.status !== null) {
    where.status = body.status;
  }

  if (body.business_status !== undefined) {
    where.business_status = body.business_status;
  }

  // Pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Validate orderBy
  const validOrderByFields = [
    "id",
    "learner_id",
    "learning_path_id",
    "status",
    "business_status",
    "created_at",
    "updated_at",
  ];

  const orderByField = validOrderByFields.includes(body.orderBy ?? "")
    ? body.orderBy!
    : "created_at";

  // Validate orderDirection
  const orderDirection =
    body.orderDirection === "asc" || body.orderDirection === "desc"
      ? body.orderDirection
      : "desc";

  // Fetch results and total count concurrently
  const [results, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_enrollments.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [orderByField]: orderDirection },
      select: {
        id: true,
        learner_id: true,
        learning_path_id: true,
        status: true,
        business_status: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.enterprise_lms_enrollments.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((enrollment) => ({
      id: enrollment.id as string & tags.Format<"uuid">,
      learner_id: enrollment.learner_id as string & tags.Format<"uuid">,
      learning_path_id: enrollment.learning_path_id as string &
        tags.Format<"uuid">,
      status: enrollment.status,
      business_status: enrollment.business_status ?? null,
      created_at: toISOStringSafe(enrollment.created_at),
      updated_at: toISOStringSafe(enrollment.updated_at),
    })),
  };
}
