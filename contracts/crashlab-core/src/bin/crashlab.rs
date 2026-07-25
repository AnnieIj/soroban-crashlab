//! CrashLab CLI — campaign control helpers for operators.
//!
//! Run `crashlab run cancel <id>` to request cooperative cancellation for the
//! campaign identified by `id`, `crashlab replay seed <bundle.json>` to
//! replay one persisted seed bundle end to end, or `crashlab regression-suite <path>`
//! to run all regression fixtures from a file or directory.

use crashlab_core::{
    RunId, cancel_marker_path, cancel_requested, default_state_dir, replay_mismatch_message,
    replay_seed_bundle_path, replay_success_message, request_cancel_run,
    run_regression_suite_from_json,
    RetentionPolicy, RetentionRecord, LocalArtifactStore, ArtifactStore,
    RunCheckpoint, CaseBundleDocument,
};
use std::fs;
use std::path::Path;

fn main() {
    env_logger::init();
    let mut args = std::env::args();
    let _prog = args.next();

    let a = args.next();
    let b = args.next();
    let c = args.next();
    let d = args.next();

    match (a.as_deref(), b.as_deref(), c.as_deref(), d.as_deref()) {
        (Some("run"), Some("cancel"), Some(id_str), None) => {
            if args.next().is_some() {
                print_usage();
                std::process::exit(1);
            }
            let id: u64 = match id_str.parse() {
                Ok(v) => v,
                Err(_) => {
                    eprintln!("invalid run id: {id_str}");
                    std::process::exit(1);
                }
            };
            let base = default_state_dir();
            let run_id = RunId(id);
            match request_cancel_run(run_id, &base) {
                Ok(()) => {
                    let path = cancel_marker_path(run_id, &base);
                    println!("cancel requested for run {id} ({})", path.display());
                }
                Err(e) => {
                    eprintln!("failed to request cancel: {e}");
                    std::process::exit(1);
                }
            }
        }
        (Some("replay"), Some("seed"), Some(path), None) => {
            if args.next().is_some() {
                print_usage();
                std::process::exit(1);
            }

            match replay_seed_bundle_path(path) {
                Ok(result) if result.matches => {
                    println!("{}", replay_success_message(&result));
                }
                Ok(result) => {
                    eprintln!("{}", replay_mismatch_message(&result));
                    std::process::exit(1);
                }
                Err(err) => {
                    eprintln!("{err}");
                    std::process::exit(1);
                }
            }
        }
        (Some("regression-suite"), Some(path), None, None) => {
            if args.next().is_some() {
                print_usage();
                std::process::exit(1);
            }
            run_regression_suite_command(path);
        }
        (Some("runs"), Some("list"), None, None) => {
            if args.next().is_some() {
                print_usage();
                std::process::exit(1);
            }
            list_runs();
        }
        (Some("retention"), Some("sweep"), None, None) => {
            if args.next().is_some() {
                print_usage();
                std::process::exit(1);
            }
            sweep_retention();
        }
        _ => {
            print_usage();
            std::process::exit(1);
        }
    }
}

fn print_usage() {
    eprintln!(
        "usage: crashlab run cancel <id>\n\
                crashlab runs list\n\
                crashlab replay seed <bundle-json-path>\n\
                crashlab regression-suite <suite-json-path-or-directory>\n\
                crashlab retention sweep"
    );
}

fn list_runs() {
    let base = default_state_dir();
    let runs_dir = base.join("runs");

    let entries = match std::fs::read_dir(&runs_dir) {
        Ok(e) => e,
        Err(_) => {
            println!("no runs found");
            return;
        }
    };

    let mut ids: Vec<u64> = entries
        .filter_map(|e| e.ok())
        .filter_map(|e| e.file_name().to_string_lossy().parse::<u64>().ok())
        .collect();

    if ids.is_empty() {
        println!("no runs found");
        return;
    }

    ids.sort_unstable();
    for id in ids {
        let run_id = RunId(id);
        let status = if cancel_requested(run_id, &base) {
            "cancelled"
        } else {
            "active"
        };
        println!("{id}\t{status}");
    }
}

fn run_regression_suite_command(path: &str) {
    let path_obj = Path::new(path);

    // Determine if path is a file or directory
    let json_bytes = if path_obj.is_file() {
        // Single file - load it directly
        match fs::read(path_obj) {
            Ok(bytes) => bytes,
            Err(e) => {
                eprintln!("failed to read file {}: {}", path, e);
                std::process::exit(1);
            }
        }
    } else if path_obj.is_dir() {
        // Directory - load all .json files and merge into a single array
        match load_fixtures_from_directory(path_obj) {
            Ok(bytes) => bytes,
            Err(e) => {
                eprintln!("failed to load fixtures from directory {}: {}", path, e);
                std::process::exit(1);
            }
        }
    } else {
        eprintln!("path does not exist or is not accessible: {}", path);
        std::process::exit(1);
    };

    // Run the regression suite
    match run_regression_suite_from_json(&json_bytes) {
        Ok(summary) => {
            println!("::group::Regression Suite Results");
            println!("Total: {}", summary.total);
            println!("Passed: {}", summary.passed);
            println!("Failed: {}", summary.failed);
            println!("::endgroup::");

            if summary.failed > 0 {
                println!();
                println!("Failed test cases:");
                for case in &summary.cases {
                    if !case.passed {
                        if let Some(ref error) = case.error {
                            eprintln!(
                                "::error::Seed {} ({}): {}",
                                case.seed_id, case.mode, error
                            );
                        } else if let Some(ref actual) = case.actual_failure_class {
                            eprintln!(
                                "::error::Seed {} ({}): expected {}, got {}",
                                case.seed_id, case.mode, case.expected_failure_class, actual
                            );
                        } else {
                            eprintln!(
                                "::error::Seed {} ({}): test failed without details",
                                case.seed_id, case.mode
                            );
                        }
                    }
                }
                std::process::exit(1);
            } else {
                println!();
                println!("✅ All regression tests passed!");
            }
        }
        Err(e) => {
            eprintln!("failed to parse or run regression suite: {}", e);
            std::process::exit(1);
        }
    }
}

fn load_fixtures_from_directory(dir: &Path) -> Result<Vec<u8>, String> {
    let mut scenarios = Vec::new();

    let entries = fs::read_dir(dir).map_err(|e| format!("failed to read directory: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("failed to read directory entry: {}", e))?;
        let path = entry.path();

        // Only process .json files
        if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("json") {
            let bytes = fs::read(&path)
                .map_err(|e| format!("failed to read {}: {}", path.display(), e))?;

            // Try to parse as a single scenario
            if let Ok(scenario) = serde_json::from_slice::<serde_json::Value>(&bytes) {
                // Check if it's an array or a single object
                if scenario.is_array() {
                    // It's already an array of scenarios
                    if let Ok(array) = serde_json::from_slice::<Vec<serde_json::Value>>(&bytes) {
                        scenarios.extend(array);
                    }
                } else {
                    // It's a single scenario
                    scenarios.push(scenario);
                }
            }
        }
    }

    if scenarios.is_empty() {
        return Err("no valid JSON fixtures found in directory".to_string());
    }

    // Serialize the combined array
    serde_json::to_vec(&scenarios).map_err(|e| format!("failed to serialize scenarios: {}", e))
}

fn sweep_retention() {
    let base = default_state_dir();
    let policy = RetentionPolicy::default();
    let now = chrono::Utc::now();

    // 1. Sweep failure bundles (artifacts)
    let store_path = base.join("artifacts");
    let store = match LocalArtifactStore::new(&store_path) {
        Ok(s) => s,
        Err(e) => {
            eprintln!("failed to open artifact store at {}: {}", store_path.display(), e);
            std::process::exit(1);
        }
    };

    let artifacts = match store.list_artifacts() {
        Ok(list) => list,
        Err(e) => {
            eprintln!("failed to list artifacts: {}", e);
            std::process::exit(1);
        }
    };

    let mut bundle_records = Vec::new();
    let mut artifact_ids = Vec::new();

    for art in &artifacts {
        let path = store_path.join(format!("{}.json", art.id));
        let bytes = match fs::read(&path) {
            Ok(b) => b,
            Err(e) => {
                eprintln!("warning: failed to read artifact file {}: {}", path.display(), e);
                continue;
            }
        };
        let doc: CaseBundleDocument = match serde_json::from_slice(&bytes) {
            Ok(d) => d,
            Err(e) => {
                eprintln!("warning: failed to parse artifact JSON {}: {}", path.display(), e);
                continue;
            }
        };
        let created_at = match chrono::DateTime::parse_from_rfc3339(&art.created_at) {
            Ok(dt) => dt.with_timezone(&chrono::Utc),
            Err(_) => chrono::Utc::now(),
        };

        bundle_records.push(RetentionRecord::new(doc, created_at));
        artifact_ids.push(art.id.clone());
    }

    let bundles_keep = policy.retain_failure_bundle_records(&bundle_records, now);
    let mut deleted_bundles = 0;
    for (i, &keep) in bundles_keep.iter().enumerate() {
        if !keep {
            let id = &artifact_ids[i];
            match store.delete_artifact(id) {
                Ok(()) => {
                    println!("pruned old failure bundle: {id}");
                    deleted_bundles += 1;
                }
                Err(e) => {
                    eprintln!("failed to delete artifact {id}: {e}");
                }
            }
        }
    }

    // 2. Sweep checkpoints
    let runs_dir = base.join("runs");
    let mut checkpoint_records = Vec::new();
    let mut run_dirs = Vec::new();

    if let Ok(entries) = fs::read_dir(&runs_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let checkpoint_path = path.join("checkpoint.json");
                if checkpoint_path.is_file() {
                    let bytes = match fs::read(&checkpoint_path) {
                        Ok(b) => b,
                        Err(e) => {
                            eprintln!("warning: failed to read checkpoint at {}: {}", checkpoint_path.display(), e);
                            continue;
                        }
                    };
                    let cp: RunCheckpoint = match serde_json::from_slice(&bytes) {
                        Ok(c) => c,
                        Err(e) => {
                            eprintln!("warning: failed to parse checkpoint at {}: {}", checkpoint_path.display(), e);
                            continue;
                        }
                    };
                    let metadata = match fs::metadata(&checkpoint_path) {
                        Ok(m) => m,
                        Err(e) => {
                            eprintln!("warning: failed to read metadata for checkpoint at {}: {}", checkpoint_path.display(), e);
                            continue;
                        }
                    };
                    let modified = metadata.modified().unwrap_or_else(|_| std::time::SystemTime::now());
                    let duration = modified.duration_since(std::time::UNIX_EPOCH).unwrap_or_default();
                    let created_at = chrono::DateTime::<chrono::Utc>::from(std::time::UNIX_EPOCH + duration);

                    checkpoint_records.push(RetentionRecord::new(cp, created_at));
                    run_dirs.push(path);
                }
            }
        }
    }

    let checkpoints_keep = policy.retain_checkpoint_records(&checkpoint_records, now);
    let mut deleted_checkpoints = 0;
    for (i, &keep) in checkpoints_keep.iter().enumerate() {
        if !keep {
            let dir = &run_dirs[i];
            match fs::remove_dir_all(dir) {
                Ok(()) => {
                    println!("pruned old run checkpoint directory: {}", dir.display());
                    deleted_checkpoints += 1;
                }
                Err(e) => {
                    eprintln!("failed to remove run directory {}: {}", dir.display(), e);
                }
            }
        }
    }

    println!("sweep summary: pruned {deleted_bundles} bundle(s), {deleted_checkpoints} checkpoint(s).");
}
