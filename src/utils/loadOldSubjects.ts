import { promises as fs } from 'fs';

const PATH = 'src/data/old_subjects.json';

export default async function loadOldSubjects(path?: string) {
    const subjectsPath = path || PATH;

    try {
        const subjects = await fs.readFile(subjectsPath, 'utf-8');
        return JSON.parse(subjects);
    } catch (error) {
        console.error('Error loading old subjects:', error);
        fs.writeFile(subjectsPath, JSON.stringify([]), 'utf-8');
        return [];
    }
}