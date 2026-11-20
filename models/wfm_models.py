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
    attendance_status = fields.Selection(
        [
            ("in_office", "In Office"),
            ("day_off", "Day Off"),
            ("absent", "Absent"),
        ],
        string="Attendance Status",
        default="in_office",
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

    @api.model
    def _restrict_app_switcher_menus(self):
        keep_ids = set()
        wfm_root = self.env.ref("technov8_wfm.menu_technov8_wfm_root", raise_if_not_found=False)
        if wfm_root:
            keep_ids.add(wfm_root.id)
        all_roots = self.env["ir.ui.menu"].search([("parent_id", "=", False)])
        for menu in all_roots:
            if menu.id not in keep_ids:
                menu.write({"active": False})
        if wfm_root:
            wfm_root.write({"active": True})


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


class Technov8PortalProfile(models.Model):
    _name = "technov8.portal.profile"
    _description = "TechNov8 Employee Portal Profile, Facial Biometrics and Access"
    _order = "name asc"

    name = fields.Char(string="Full Name", required=True)
    email = fields.Char(string="Work Email")
    phone = fields.Char(string="Phone Number")
    location = fields.Selection(
        [
            ("Sandton", "Sandton"),
            ("Gqeberha", "Gqeberha"),
            ("WFH", "WFH"),
        ],
        string="Office / Mode",
        default="Sandton",
        required=True,
    )
    department = fields.Char(string="Department", default="Engineering", required=True)
    role_title = fields.Char(string="Role", required=True)
    facial_registered = fields.Boolean(string="Facial Biometric Registered", default=False)
    facial_photo_name = fields.Char(string="Uploaded Face Photo File")
    facial_photo_base64 = fields.Text(string="Uploaded Face Photo Data")
    access_view_dashboard = fields.Boolean(string="View Dashboard", default=True)
    access_view_employees = fields.Boolean(string="View Employees", default=False)
    access_attendance = fields.Boolean(string="Attendance", default=True)
    access_reports = fields.Boolean(string="Reports", default=False)
