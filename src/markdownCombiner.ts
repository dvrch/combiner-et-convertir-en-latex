export async function getUniqueFileName(baseName: string, checkExists: (name: string) => Promise<boolean>): Promise<string> {
    let fileName = baseName;
    let counter = 1;
    const nameWithoutExt = baseName.replace(/\.[^/.]+$/, '');
    const ext = baseName.match(/\.[^/.]+$/)?.[0] || '';
    while (await checkExists(fileName)) {
        fileName = `${nameWithoutExt}_${counter}${ext}`;
        counter++;
    }
    return fileName;
} 