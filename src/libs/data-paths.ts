import path from 'path';
import { fileURLToPath } from 'url';

// Get current file's directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Export absolute paths to data files
export const PROJECT_BRIEFS_PATH = path.resolve(__dirname, '../data/project_briefs.json'); 