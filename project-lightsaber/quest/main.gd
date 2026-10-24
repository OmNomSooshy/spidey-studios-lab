extends Node3D

const FONT_ZIP := "res://assets/SmthJedi-ProffieOS.zip"
const FONT_ROOT := "user://fonts/SmthJedi"
const NS_PER_SECOND := 1000000000.0

@onready var controller: XRController3D = $XROrigin3D/RightController
@onready var blade: MeshInstance3D = $XROrigin3D/RightController/Blade
@onready var audio_player: AudioStreamPlayer = $AudioStreamPlayer
@onready var status_label: Label3D = $XROrigin3D/XRCamera3D/Status

var saber_stream: SaberAudioStream
var xr_interface: XRInterface
var tracking_samples := 0
var rate_window_samples := 0
var rate_window_started_us := 0
var right_tracker: XRPositionalTracker
var status_message := "Starting OpenXR..."

func _ready() -> void:
	# The Quest 3 OpenXR runtime supplies alpha-blend passthrough. It starts
	# automatically when the interface uses alpha blend; no black VR world.
	xr_interface = XRServer.find_interface("OpenXR")
	if xr_interface == null or not xr_interface.initialize():
		status_message = "OpenXR failed to initialize; passthrough unavailable."
		push_error(status_message)
		status_label.text = status_message
		return
	get_viewport().use_xr = true
	get_viewport().transparent_bg = true
	xr_interface.environment_blend_mode = XRInterface.XR_ENV_BLEND_MODE_ALPHA_BLEND
	controller.button_pressed.connect(_on_controller_button)
	controller.tracking_changed.connect(_on_tracking_changed)
	XRServer.tracker_added.connect(_on_tracker_added)
	XRServer.tracker_removed.connect(_on_tracker_removed)
	_attach_right_tracker()

	var font_dir := _extract_font()
	if font_dir.is_empty():
		status_message = "Bundled SmthJedi font extraction failed."
		status_label.text = status_message
		return
	saber_stream = SaberAudioStream.new()
	if not saber_stream.load_font(ProjectSettings.globalize_path(font_dir)):
		status_message = "SmthJedi load failed; see native log for details."
		status_label.text = status_message
		return
	audio_player.stream = saber_stream
	audio_player.play()
	status_message = "Ready — A ignite, B retract."
	status_label.text = status_message
	print("Lightsaber Quest ready: ", saber_stream.diagnostics())

func _attach_right_tracker() -> void:
	right_tracker = XRServer.get_tracker(&"right_hand") as XRPositionalTracker
	if right_tracker == null:
		status_message = "Waiting for right Touch Plus tracker."
		status_label.text = status_message
		return
	if not right_tracker.pose_changed.is_connected(_on_pose_changed):
		right_tracker.pose_changed.connect(_on_pose_changed)
	if not right_tracker.pose_lost_tracking.is_connected(_on_pose_lost):
		right_tracker.pose_lost_tracking.connect(_on_pose_lost)

func _on_tracker_added(tracker_name: StringName, tracker_type: int) -> void:
	if tracker_name == &"right_hand" and tracker_type == XRServer.TRACKER_CONTROLLER:
		_attach_right_tracker()

func _on_tracker_removed(tracker_name: StringName, _tracker_type: int) -> void:
	if tracker_name == &"right_hand":
		right_tracker = null
		_on_pose_lost(null)

func _on_pose_changed(pose: XRPose) -> void:
	if pose.name != &"grip" or saber_stream == null or not saber_stream.is_font_ready() or not pose.has_tracking_data:
		return
	# pose_changed fires when the runtime supplies a new controller pose, unlike
	# render-frame polling which can submit the same cached velocity repeatedly.
	var omega_world: Vector3 = pose.angular_velocity
	# Godot copies OpenXR's valid angularVelocity vector in play-space coordinates;
	# OpenXR defines these values in radians/second. Convert into grip-local axes,
	# then map the controller's long grip axis (-Z) to core X and its transverse
	# axes (X/Y) to the core's Y/Z swing plane. Physical feel will verify this
	# convention in-headset.
	var omega_local: Vector3 = pose.transform.basis.inverse() * omega_world
	var to_dps := 180.0 / PI
	var timestamp_ns := Time.get_ticks_usec() * 1000
	saber_stream.submit_motion(omega_local.z * to_dps, omega_local.x * to_dps,
		omega_local.y * to_dps, timestamp_ns)
	tracking_samples += 1
	rate_window_samples += 1
	var now_us := Time.get_ticks_usec()
	if rate_window_started_us == 0:
		rate_window_started_us = now_us
	elif now_us - rate_window_started_us >= 1000000:
		var hz := float(rate_window_samples) * 1000000.0 / float(now_us - rate_window_started_us)
		status_label.text = "Right controller tracking: %.0f Hz\n%s" % [hz, saber_stream.diagnostics()]
		rate_window_samples = 0
		rate_window_started_us = now_us

func _on_pose_lost(_pose: XRPose) -> void:
	if saber_stream != null and saber_stream.is_on():
		saber_stream.retract()
		blade.hide()
	status_message = "Right controller tracking lost; saber retracted and motion samples stopped."
	status_label.text = status_message
	print(status_message)

func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_PAUSED or what == NOTIFICATION_APPLICATION_FOCUS_OUT:
		if saber_stream != null:
			saber_stream.retract()
		blade.hide()

func _on_controller_button(button_name: String) -> void:
	if saber_stream == null or not saber_stream.is_font_ready():
		return
	if button_name == "ax_button" and not saber_stream.is_on():
		saber_stream.ignite()
		blade.show()
		status_message = "Ignited — B retracts."
	elif button_name == "by_button" and saber_stream.is_on():
		saber_stream.retract()
		blade.hide()
		status_message = "Retracting — A ignites."
	status_label.text = status_message
	print(status_message, " ", saber_stream.diagnostics())

func _on_tracking_changed(tracking: bool) -> void:
	if not tracking:
		status_message = "Right controller tracking paused; motion input stopped."
		status_label.text = status_message
		print(status_message)

func _extract_font() -> String:
	var destination := ProjectSettings.globalize_path(FONT_ROOT)
	if DirAccess.dir_exists_absolute(destination):
		return FONT_ROOT
	var zip := ZIPReader.new()
	var err := zip.open(FONT_ZIP)
	if err != OK:
		push_error("Unable to open bundled font ZIP (%s): %s" % [FONT_ZIP, error_string(err)])
		return ""
	for path in zip.get_files():
		if not path.begins_with("SmthJedi/") or path.ends_with("/"):
			continue
		var relative := path.trim_prefix("SmthJedi/")
		if relative.contains("..") or relative.begins_with("/"):
			push_error("Unsafe path in bundled font archive: " + path)
			zip.close()
			return ""
		var target := FONT_ROOT.path_join(relative)
		var parent := target.get_base_dir()
		var mkdir_err := DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(parent))
		if mkdir_err != OK:
			push_error("Font extraction folder access failed: " + parent)
			zip.close()
			return ""
		var output := FileAccess.open(target, FileAccess.WRITE)
		if output == null:
			push_error("Font extraction write failed: " + target)
			zip.close()
			return ""
		output.store_buffer(zip.read_file(path))
		output.close()
	zip.close()
	if not FileAccess.file_exists(FONT_ROOT.path_join("smoothsw.ini")):
		push_error("Bundled font archive has no SmoothSwing V2 configuration.")
		return ""
	return FONT_ROOT
