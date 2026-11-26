# Infrastructure — Docker

This folder holds infrastructure notes and extra compose overrides.
The canonical local stack lives in the repo root: `docker-compose.yml`
plus one `Dockerfile` per app (`frontend/Dockerfile`, `admin/Dockerfile`,
`backend/Dockerfile`).

Full Docker rules, health checks and the known limitation of Muse's dev VM
(containers cannot run there) are in
`docs/project-management/DOCKER_STANDARDS.md`.
