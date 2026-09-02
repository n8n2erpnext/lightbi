use serde::Deserialize;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    AppHandle, Emitter,
};
use tauri_plugin_opener::OpenerExt;

const REGISTRY_JSON: &str =
    include_str!("../../../apps/desktop/src/lib/desktop-command-registry.json");
const ROUTING_JSON: &str = include_str!("../../../apps/desktop/src/lib/lightbi-routing.json");
const MENU_EVENT_PREFIX: &str = "lightbi:";

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DesktopCommand {
    id: String,
    label: String,
    group: String,
    accelerator: Option<String>,
    #[serde(default = "default_true")]
    native_menu: bool,
}

fn default_true() -> bool {
    true
}

fn commands() -> Result<Vec<DesktopCommand>, serde_json::Error> {
    serde_json::from_str(REGISTRY_JSON)
}

fn documentation_url_for(channel: &str) -> Result<String, String> {
    let manifest: serde_json::Value = serde_json::from_str(ROUTING_JSON)
        .map_err(|error| format!("Invalid LightBI routing manifest: {error}"))?;
    let environment = if channel == "internal" { "next" } else { "production" };
    let profile = manifest
        .get(environment)
        .ok_or_else(|| format!("Missing LightBI routing profile: {environment}"))?;
    let origin = profile
        .get("publicOrigin")
        .and_then(serde_json::Value::as_str)
        .ok_or_else(|| "LightBI routing publicOrigin is missing.".to_string())?
        .trim_end_matches('/');
    let path = profile
        .get("routes")
        .and_then(|routes| routes.get("docs"))
        .and_then(serde_json::Value::as_str)
        .ok_or_else(|| "LightBI docs route is missing.".to_string())?;
    Ok(format!("{origin}{}", if path.starts_with('/') { path.to_string() } else { format!("/{path}") }))
}

fn documentation_url() -> Result<String, String> {
    documentation_url_for(option_env!("VITE_LIGHTBI_CHANNEL").unwrap_or("production"))
}

fn append_registry_group(
    app: &AppHandle,
    submenu: &Submenu<tauri::Wry>,
    group: &str,
    registry: &[DesktopCommand],
) -> tauri::Result<()> {
    for command in registry
        .iter()
        .filter(|item| item.native_menu && item.group == group)
    {
        let item = MenuItem::with_id(
            app,
            format!("{MENU_EVENT_PREFIX}{}", command.id),
            &command.label,
            true,
            command.accelerator.as_deref(),
        )?;
        submenu.append(&item)?;
    }
    Ok(())
}
pub fn install_native_menu(app: &AppHandle) -> Result<(), String> {
    let registry =
        commands().map_err(|error| format!("Invalid desktop command registry: {error}"))?;
    let menu = Menu::new(app).map_err(|error| error.to_string())?;

    let file = Submenu::new(app, "File", true).map_err(|error| error.to_string())?;
    append_registry_group(app, &file, "File", &registry).map_err(|error| error.to_string())?;
    file.append(&PredefinedMenuItem::separator(app).map_err(|error| error.to_string())?)
        .map_err(|error| error.to_string())?;
    file.append(
        &PredefinedMenuItem::close_window(app, None::<&str>).map_err(|error| error.to_string())?,
    )
    .map_err(|error| error.to_string())?;
    file.append(&PredefinedMenuItem::quit(app, None::<&str>).map_err(|error| error.to_string())?)
        .map_err(|error| error.to_string())?;

    let edit = Submenu::new(app, "Edit", true).map_err(|error| error.to_string())?;
    for item in [
        PredefinedMenuItem::undo(app, None::<&str>),
        PredefinedMenuItem::redo(app, None::<&str>),
    ] {
        edit.append(&item.map_err(|error| error.to_string())?)
            .map_err(|error| error.to_string())?;
    }
    edit.append(&PredefinedMenuItem::separator(app).map_err(|error| error.to_string())?)
        .map_err(|error| error.to_string())?;
    for item in [
        PredefinedMenuItem::cut(app, None::<&str>),
        PredefinedMenuItem::copy(app, None::<&str>),
        PredefinedMenuItem::paste(app, None::<&str>),
        PredefinedMenuItem::select_all(app, None::<&str>),
    ] {
        edit.append(&item.map_err(|error| error.to_string())?)
            .map_err(|error| error.to_string())?;
    }
    edit.append(&PredefinedMenuItem::separator(app).map_err(|error| error.to_string())?)
        .map_err(|error| error.to_string())?;
    append_registry_group(app, &edit, "Edit", &registry).map_err(|error| error.to_string())?;
    let view = Submenu::new(app, "View", true).map_err(|error| error.to_string())?;
    append_registry_group(app, &view, "View", &registry).map_err(|error| error.to_string())?;

    let help = Submenu::new(app, "Help", true).map_err(|error| error.to_string())?;
    append_registry_group(app, &help, "Help", &registry).map_err(|error| error.to_string())?;

    for submenu in [&file, &edit, &view, &help] {
        menu.append(submenu).map_err(|error| error.to_string())?;
    }
    app.set_menu(menu).map_err(|error| error.to_string())?;
    Ok(())
}

pub fn forward_native_menu_event(app: &AppHandle, id: &str) {
    let Some(command_id) = id.strip_prefix(MENU_EVENT_PREFIX) else {
        return;
    };
    let Ok(registry) = commands() else {
        return;
    };
    if !registry
        .iter()
        .any(|command| command.native_menu && command.id == command_id)
    {
        return;
    }
    if command_id == "documentation" {
        if let Ok(url) = documentation_url() {
            let _ = app.opener().open_url(url, None::<&str>);
        }
        return;
    }
    let _ = app.emit("lightbi://desktop-command", command_id.to_string());
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    #[test]
    fn shared_registry_is_unique_and_covers_native_menu_groups() {
        let registry = commands().expect("desktop command registry");
        let mut ids = HashSet::new();
        let mut accelerators = HashSet::new();
        for command in &registry {
            assert!(
                ids.insert(command.id.clone()),
                "duplicate command id {}",
                command.id
            );
            if let Some(accelerator) = &command.accelerator {
                assert!(
                    accelerators.insert(accelerator.clone()),
                    "duplicate accelerator {accelerator}"
                );
            }
        }
        let groups: HashSet<_> = registry
            .iter()
            .filter(|item| item.native_menu)
            .map(|item| item.group.as_str())
            .collect();
        assert_eq!(groups, HashSet::from(["File", "Edit", "View", "Help"]));
        assert!(registry
            .iter()
            .any(|item| item.id == "search" && item.accelerator.as_deref() == Some("CmdOrCtrl+K")));
        assert!(registry
            .iter()
            .any(|item| item.id == "invite" && !item.native_menu));
    }

    #[test]
    fn documentation_menu_uses_the_environment_routing_manifest() {
        assert_eq!(documentation_url_for("internal").unwrap(), "https://lightbi-next.thaiduy.digital/docs");
        assert_eq!(documentation_url_for("production").unwrap(), "https://lightbi.thaiduy.digital/docs");
    }
}
