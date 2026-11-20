from datetime import timedelta
from odoo import api, fields, models
from odoo.exceptions import ValidationError


class Technov8AttendanceLog(models.Model):
_name = "technov8.attendance.log"
_description = "TechNov8 Gate and Remote Attendance Log"
_order = "scan_time desc"

employee_id = fields.Many2one("hr.employee", string="Employee", required=True)
department_id = fields.Many2one(
    "hr.department",
    related="employee_id.department_id",
    store=True,
    string="Department",
)
scan_time = fields.Datetime(
    string="Scan Time",
    default=fields.Datetime.now,
    required=True,
)
site_location = fields.Selection(
    [
        ("sandton", "Sandton"),
        ("gqeberha", "Gqeberha"),
        ("wfh", "Remote / WFH"),
    ],
    string="Site / Mode",
    default="sandton",
    required=True,
)
scan_direction = fields.Selection(
    [
        ("in", "Check In"),
        ("out", "Check Out"),
    ],
    string="Direction",
    default="in",
    required=True,
)
schedule_flag = fields.Selection(
    [
        ("on_time", "On Time"),
        ("late_arrival", "Late Arrival (>09:05 SAST)"),
        ("early_departure", "Early Departure (<17:00 SAST)"),
    ],
    string="SAST Schedule Flag",
    compute="_compute_schedule_flag",
    store=True,
)

@api.depends("scan_time", "scan_direction")
def _compute_schedule_flag(self):
    for rec in self:
        flag = "on_time"
        if rec.scan_time:
            sast_dt = fields.Datetime.context_timestamp(
                rec.with_context(tz="Africa/Johannesburg"),
                rec.scan_time,
            )
            mins = sast_dt.hour * 60 + sast_dt.minute
            if rec.scan_direction == "in" and mins > (9 * 60 + 5):
                flag = "late_arrival"
            elif rec.scan_direction == "out" and mins < (17 * 60):
                flag = "early_departure"
        rec.schedule_flag = flag

@api.model_create_multi
def create(self, vals_list):
    for vals in vals_list:
        emp_id = vals.get("employee_id")
        scan_dt = fields.Datetime.to_datetime(
            vals.get("scan_time") or fields.Datetime.now()
        )
        if emp_id:
            cutoff = scan_dt - timedelta(minutes=15)
            recent = self.search(
                [
                    ("employee_id", "=", emp_id),
                    ("scan_time", ">=", cutoff),
                    ("scan_time", "<=", scan_dt),
                ],
                limit=1,
            )
            if recent:
                raise ValidationError(
                    "Scan rejected: minimum 15-minute separation between scans."
                )
    return super().create(vals_list)


class Technov8LeaveRequest(models.Model):
_name = "technov8.leave.request"
_description = "TechNov8 Sequential Leave Approval"
_order = "id desc"

name = fields.Char(string="Reference", default="New", required=True, copy=False)
employee_id = fields.Many2one("hr.employee", string="Employee", required=True)
department_id = fields.Many2one(
    "hr.department",
    related="employee_id.department_id",
    store=True,
    string="Department",
)
leave_type = fields.Selection(
    [
        ("annual", "Annual Leave"),
        ("family", "Family Responsibility"),
        ("sick", "Sick Leave"),
    ],
    string="Leave Type",
    default="annual",
    required=True,
)
days = fields.Integer(string="Days", default=1, required=True)
approval_stage = fields.Selection(
    [
        ("pending_specialist", "Pending Specialist Approval"),
        ("pending_manager", "Pending Line Manager Approval"),
        ("approved", "Approved"),
    ],
    string="Approval Status",
    default="pending_specialist",
    required=True,
)

@api.model_create_multi
def create(self, vals_list):
    records = super().create(vals_list)
    for rec in records:
        if rec.name == "New":
            rec.name = f"LV-{rec.id:04d}"
    return records

def action_specialist_approve(self):
    for rec in self:
        if rec.approval_stage == "pending_specialist":
            rec.approval_stage = "pending_manager"

def action_manager_approve(self):
    for rec in self:
        if rec.approval_stage == "pending_manager":
            rec.approval_stage = "approved"