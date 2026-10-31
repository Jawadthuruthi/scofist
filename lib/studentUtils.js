/**
 * Utilities for student status and period evaluation.
 */

/**
 * Determines whether a student was active during a given date period (e.g. selected month),
 * based on their admission date, dropout date, graduation year, and batch lifecycle,
 * rather than strictly relying on their current status.
 *
 * @param {Object} student - Student user object containing studentSpecificField
 * @param {Date|string|null} periodStart - Start of the period (e.g. 1st of month)
 * @param {Date|string|null} periodEnd - End of the period (e.g. end of month)
 * @param {Object} [batchMap={}] - Map of batchId -> batch object ({ startYear, endYear, status })
 * @returns {boolean} Whether the student was active during the specified period
 */
export function isStudentActiveInPeriod(student, periodStart, periodEnd, batchMap = {}) {
  if (!student) return false;

  const sf = student.studentSpecificField || {};
  const currentStatus = sf.status; // "Active", "Dropped Out", "Graduated", or ""

  // Normalize dates
  const pStart = periodStart ? new Date(periodStart) : null;
  const pEnd = periodEnd ? new Date(periodEnd) : (pStart ? new Date(pStart) : null);

  if (pEnd && !isNaN(pEnd.getTime())) {
    pEnd.setHours(23, 59, 59, 999);
  }
  if (pStart && !isNaN(pStart.getTime())) {
    pStart.setHours(0, 0, 0, 0);
  }

  const targetDate = pEnd || pStart || new Date();
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth(); // 0 = Jan, 11 = Dec

  // 1. Admission Check:
  // If student was admitted AFTER the period end, they were not yet admitted during this period.
  if (sf.admissionDate && pEnd) {
    const admission = new Date(sf.admissionDate);
    if (!isNaN(admission.getTime()) && admission > pEnd) {
      return false;
    }
  }

  // 2. Batch Lifecycle Check:
  const batch = sf.batchId ? batchMap[sf.batchId.toString()] : null;
  if (batch) {
    if (batch.startYear && targetYear < batch.startYear) {
      return false;
    }
    if (batch.endYear && targetYear > batch.endYear) {
      return false;
    }
  }

  // 3. Status-Specific Checks:
  // Dropped out students must never be considered active or eligible for toppers
  if (currentStatus === "Dropped Out") {
    return false;
  }

  if (currentStatus === "Graduated") {
    const gradYear = parseInt(sf.graduatedYear || (batch && batch.endYear), 10);
    if (gradYear) {
      if (targetYear > gradYear) {
        // Already graduated in a prior year
        return false;
      }
      if (targetYear < gradYear) {
        // Graduating in a future year -> WAS active in this period
        return true;
      }
      // targetYear === gradYear:
      // Academic year typically ends around May/June.
      // From June onwards (month index >= 5), they have already graduated.
      // Prior to June (month index < 5), they were still in final semester/active.
      if (targetMonth >= 5) {
        return false;
      }
      return true;
    }
    // Graduated without year info -> exclude
    return false;
  }

  // 4. Default / "Active" status:
  // Student is active unless ruled out by admission or batch endYear above
  return true;
}

