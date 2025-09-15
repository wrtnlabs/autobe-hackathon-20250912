import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformRiskAssessment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRiskAssessment";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new risk assessment record in the
 * healthcare_platform_risk_assessments table.
 *
 * This endpoint allows system administrators to add new compliance,
 * operational, or incident-driven risk reviews. It strictly enforces all field
 * requirements and branding, ensures window_start is before or equal to
 * window_end, and never uses the native Date type. UUIDs are always generated,
 * and all date fields are valid ISO 8601 strings.
 *
 * @param props - SystemAdmin - SystemadminPayload, the authenticated system
 *   admin performing the operation body -
 *   IHealthcarePlatformRiskAssessment.ICreate, data required to create risk
 *   assessment
 * @returns IHealthcarePlatformRiskAssessment - The newly created record
 * @throws {Error} If business logic (window_start > window_end)
 */
export async function posthealthcarePlatformSystemAdminRiskAssessments(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformRiskAssessment.ICreate;
}): Promise<IHealthcarePlatformRiskAssessment> {
  const { systemAdmin, body } = props;

  // Business validation: window_start cannot be after window_end
  if (body.window_start > body.window_end) {
    throw new Error(
      "The risk assessment window_start must be before or equal to window_end.",
    );
  }

  const now = toISOStringSafe(new Date());

  // Create the risk assessment record
  const created =
    await MyGlobal.prisma.healthcare_platform_risk_assessments.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        organization_id: body.organization_id,
        assessor_id: body.assessor_id ?? null,
        department_id: body.department_id ?? null,
        assessment_type: body.assessment_type,
        status: body.status,
        methodology: body.methodology,
        risk_level: body.risk_level,
        window_start: body.window_start,
        window_end: body.window_end,
        recommendations: body.recommendations ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  // Return normalized API contract (null vs undefined for optionals)
  return {
    id: created.id,
    organization_id: created.organization_id,
    // Optional/nullable - use undefined for API, null for DB
    assessor_id: created.assessor_id ?? undefined,
    department_id: created.department_id ?? undefined,
    assessment_type: created.assessment_type,
    status: created.status,
    methodology: created.methodology,
    risk_level: created.risk_level,
    window_start: created.window_start,
    window_end: created.window_end,
    recommendations: created.recommendations ?? undefined,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at ?? undefined,
  };
}
