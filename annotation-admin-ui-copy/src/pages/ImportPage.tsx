import { useState, useRef } from 'react';
import { 
    Title, 
    Paper, 
    Text, 
    Stack, 
    Button, 
    Group, 
    FileInput, 
    Select, 
    LoadingOverlay,
    Stepper,
    rem,
    Alert,
    Table
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
    IconUpload, 
    IconFileUpload, 
    IconFileText, 
    IconCheck
} from '@tabler/icons-react';
import { importCSV } from '../api/import';
import { listProjects } from '../api/projects';

// CSV Preview Interface
interface CSVPreview {
    headers: string[];
    rows: string[][];
    filename: string;
}

export function ImportPage() {
    const [files, setFiles] = useState<File[]>([]);
    const [activeStep, setActiveStep] = useState(0);
    const [csvPreviews, setCsvPreviews] = useState<CSVPreview[]>([]);
    const [mappings, setMappings] = useState<Record<string, string>>({});
    const [importResults, setImportResults] = useState<any[]>([]);
    const [currentFileIndex, setCurrentFileIndex] = useState(0);
    const [importing, setImporting] = useState(false);
    const fileInputRef = useRef<HTMLButtonElement>(null);

    // Fetch available projects
    const { data: projects, isLoading: isLoadingProjects } = useQuery({
        queryKey: ['projects'],
        queryFn: listProjects,
    });

    // Import mutation
    const importMutation = useMutation({
        mutationFn: (data: { 
            file: File, 
            projectId: number, 
            containerName: string, 
            mappings: Record<string, string> 
        }) => {
            return importCSV(data.file, data.projectId, data.containerName, data.mappings);
        },
        onSuccess: (data) => {
            setImportResults(prev => [...prev, data]);
            
            // Continue with next file if there are more
            if (currentFileIndex < files.length - 1) {
                setCurrentFileIndex(prev => prev + 1);
                importNextFile();
            } else {
                setImporting(false);
                notifications.show({
                    title: 'Success',
                    message: `Imported ${files.length} file(s) successfully`,
                    color: 'green',
                });
                nextStep();
            }
        },
        onError: (error: any) => {
            setImporting(false);
            notifications.show({
                title: 'Error',
                message: error.response?.data?.detail || 'Failed to import data',
                color: 'red',
            });
        },
    });

    // Form for project selection
    const form = useForm({
        initialValues: {
            projectId: '',
        },
        validate: {
            projectId: (value) => (!value ? 'Project is required' : null),
        },
    });

    // Parse CSV file and generate preview
    const parseCSV = (file: File): Promise<CSVPreview> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const text = event.target?.result as string;
                    const lines = text.split('\n').filter(line => line.trim().length > 0);
                    
                    if (lines.length < 2) {
                        reject(new Error('CSV file must contain at least a header row and one data row'));
                        return;
                    }
                    
                    // Better CSV parsing that handles quoted values
                    const parseCSVLine = (line: string) => {
                        const result = [];
                        let current = '';
                        let inQuotes = false;
                        
                        for (let i = 0; i < line.length; i++) {
                            const char = line[i];
                            
                            if (char === '"') {
                                inQuotes = !inQuotes;
                            } else if (char === ',' && !inQuotes) {
                                result.push(current.trim());
                                current = '';
                            } else {
                                current += char;
                            }
                        }
                        
                        // Add the last field
                        result.push(current.trim());
                        return result;
                    };
                    
                    // Parse headers and rows
                    const headers = parseCSVLine(lines[0]);
                    const rows = lines.slice(1, Math.min(6, lines.length)).map(parseCSVLine);
                    
                    console.log('Parsed CSV headers:', headers);
                    console.log('Parsed CSV preview (first row):', rows[0]);
                    
                    resolve({ headers, rows, filename: file.name });
                } catch (error) {
                    console.error('CSV parsing error:', error);
                    reject(error);
                }
            };
            reader.onerror = (error) => reject(error);
            reader.readAsText(file);
        });
    };

    // Handle file selection
    const handleFileChange = async (selectedFiles: File[] | null) => {
        if (!selectedFiles || selectedFiles.length === 0) {
            setFiles([]);
            setCsvPreviews([]);
            return;
        }
        
        setFiles(selectedFiles);
        
        // Parse each file and generate preview
        const previews: CSVPreview[] = [];
        for (const file of selectedFiles) {
            try {
                const preview = await parseCSV(file);
                previews.push(preview);
                
                // Create automatic mappings for this file
                if (previews.length === 1) { // Only do this for the first file
                    createAutomaticMappings(preview);
                }
            } catch (error) {
                notifications.show({
                    title: 'Error',
                    message: `Failed to parse ${file.name}`,
                    color: 'red',
                });
            }
        }
        
        setCsvPreviews(previews);
    };

    // Create automatic mappings based on column names
    const createAutomaticMappings = (preview: CSVPreview) => {
        const autoMappings: Record<string, string> = {};
        
        // Define known column mappings
        const knownMappings: Record<string, string> = {
            // Required field mappings
            'content': 'content',
            'text': 'content',
            'message': 'content',
            'turn_text': 'content',
            
            // Common metadata mappings
            'user_id': 'user_id',
            'user': 'user_id',
            'username': 'user_id',
            'author': 'user_id',
            
            'turn_id': 'turn_id',
            'message_id': 'turn_id',
            'id': 'turn_id',
            
            'reply_to': 'reply_to_turn',
            'reply_to_turn': 'reply_to_turn',
            'parent_id': 'reply_to_turn',
            
            'timestamp': 'timestamp',
            'created_at': 'timestamp',
            'date': 'timestamp',
            
            'title': 'title',
            'name': 'title',
            'heading': 'title',
            
            'category': 'category',
            'type': 'category',
            'class': 'category',
            
            'source': 'source',
            'origin': 'source',
            'from': 'source'
        };
        
        // Try to match headers with known mappings
        preview.headers.forEach(header => {
            const lowerHeader = header.toLowerCase().trim();
            for (const [key, value] of Object.entries(knownMappings)) {
                if (lowerHeader === key || lowerHeader.includes(key)) {
                    autoMappings[header] = value;
                    break;
                }
            }
        });
        
        setMappings(autoMappings);
    };

    // Step handlers
    const nextStep = () => setActiveStep(current => current + 1);
    const prevStep = () => setActiveStep(current => current - 1);

    // Import all files in sequence
    const importAllFiles = form.onSubmit(() => {
        if (files.length === 0 || csvPreviews.length === 0) {
            notifications.show({
                title: 'Error',
                message: 'Please select CSV file(s) first',
                color: 'red',
            });
            return;
        }

        // Check if content mapping is defined
        if (!Object.values(mappings).includes('content') && !mappings.content) {
            // Try to auto-detect turn_text column in the first file
            if (csvPreviews[0].headers.includes('turn_text')) {
                const autoMappings = { ...mappings };
                autoMappings['content'] = 'turn_text';
                setMappings(autoMappings);
            } else {
                notifications.show({
                    title: 'Error',
                    message: 'You must map a column to the "content" field',
                    color: 'red',
                });
                return;
            }
        }

        setImporting(true);
        setImportResults([]);
        setCurrentFileIndex(0);
        
        // Start importing the first file
        importNextFile();
    });

    // Import the current file
    const importNextFile = () => {
        const projectId = parseInt(form.values.projectId);
        const file = files[currentFileIndex];
        
        // Generate a container name from the file name
        const containerName = file.name.replace('.csv', '');
        
        importMutation.mutate({
            file,
            projectId,
            containerName,
            mappings
        });
    };

    // Reset the import process
    const handleReset = () => {
        setFiles([]);
        setCsvPreviews([]);
        setMappings({});
        setImportResults([]);
        setCurrentFileIndex(0);
        setImporting(false);
        form.reset();
        setActiveStep(0);
    };

    return (
        <Stack gap="lg" style={{ width: '100%' }}>
            <Paper p="md" radius="sm" withBorder>
                <Stack>
                    <Title order={2} mb={5}>Import Data</Title>
                    <Text c="dimmed" mb="lg">Upload CSV files to import into your projects</Text>
                    
                    <Stepper active={activeStep} onStepClick={setActiveStep}>
                        <Stepper.Step
                            label="Select Files"
                            description="Upload CSV files"
                            icon={<IconFileUpload style={{ width: rem(18), height: rem(18) }} />}
                        >
                            <Paper p="xl" withBorder style={{ textAlign: 'center', position: 'relative' }}>
                                <LoadingOverlay visible={importMutation.isPending} />
                                
                                <IconUpload size={48} stroke={1.5} style={{ marginBottom: 16, opacity: 0.4 }} />
                                <Title order={3} mb={8}>Upload CSV Files</Title>
                                <Text c="dimmed" mb="lg">
                                    Select one or more CSV files to import data
                                </Text>
                                
                                <Group justify="center">
                                    <FileInput
                                        ref={fileInputRef}
                                        accept=".csv"
                                        placeholder="Select CSV file(s)"
                                        multiple
                                        value={files.length > 0 ? files : undefined}
                                        onChange={handleFileChange}
                                        leftSection={<IconFileText size={rem(16)} />}
                                        style={{ maxWidth: '400px' }}
                                    />
                                </Group>
                                
                                {csvPreviews.length > 0 && (
                                    <Stack gap="xl" mt="xl">
                                        {csvPreviews.map((preview, previewIndex) => (
                                            <Paper key={previewIndex} withBorder p="md">
                                                <Title order={4} mb="md">{preview.filename}</Title>
                                                <Table>
                                                    <Table.Thead>
                                                        <Table.Tr>
                                                            {preview.headers.map((header, index) => (
                                                                <Table.Th key={index}>{header}</Table.Th>
                                                            ))}
                                                        </Table.Tr>
                                                    </Table.Thead>
                                                    <Table.Tbody>
                                                        {preview.rows.map((row, rowIndex) => (
                                                            <Table.Tr key={rowIndex}>
                                                                {row.map((cell, cellIndex) => (
                                                                    <Table.Td key={cellIndex}>{cell}</Table.Td>
                                                                ))}
                                                            </Table.Tr>
                                                        ))}
                                                    </Table.Tbody>
                                                </Table>
                                            </Paper>
                                        ))}
                                        
                                        <Group justify="center" mt="lg">
                                            <Button 
                                                rightSection={<IconUpload size={16} />}
                                                onClick={nextStep}
                                                disabled={csvPreviews.length === 0}
                                            >
                                                Continue to Import
                                            </Button>
                                        </Group>
                                    </Stack>
                                )}
                            </Paper>
                        </Stepper.Step>
                        
                        <Stepper.Step
                            label="Import"
                            description="Select project and import"
                            icon={<IconUpload style={{ width: rem(18), height: rem(18) }} />}
                        >
                            <Paper p="xl" withBorder>
                                <LoadingOverlay visible={importMutation.isPending || isLoadingProjects || importing} />
                                
                                <Title order={3} mb="lg">Import Configuration</Title>
                                
                                <Alert icon={<IconCheck size={16} />} title="Automatic Mapping Applied" color="green" mb="md">
                                    CSV columns have been automatically mapped. The system maps columns like 
                                    "turn_text" to content, "reply_to_turn" to reply references, and other fields automatically.
                                </Alert>
                                
                                <form onSubmit={importAllFiles}>
                                    <Stack>
                                        <Select
                                            label="Select Project"
                                            placeholder="Select the project to import data into"
                                            data={projects?.map(project => ({ 
                                                value: project.id.toString(), 
                                                label: project.name 
                                            })) || []}
                                            required
                                            searchable
                                            {...form.getInputProps('projectId')}
                                        />
                                        
                                        <Alert color="gray" mt="md" title="Column Mappings">
                                            <Stack gap="xs">
                                                {Object.entries(mappings).map(([field, column]) => (
                                                    <Group key={field} justify="apart">
                                                        <Text fw={500}>{field}:</Text>
                                                        <Text>{column}</Text>
                                                    </Group>
                                                ))}
                                            </Stack>
                                        </Alert>
                                        
                                        <Text fw={500} mt="md">Files to Import ({files.length}):</Text>
                                        <Stack gap="xs">
                                            {files.map((file, index) => (
                                                <Text key={index}>{file.name}</Text>
                                            ))}
                                        </Stack>
                                        
                                        <Group justify="center" mt="lg">
                                            <Button variant="light" onClick={prevStep}>
                                                Back
                                            </Button>
                                            <Button 
                                                type="submit" 
                                                loading={importMutation.isPending || importing}
                                            >
                                                {files.length > 1 ? 'Import All Files' : 'Import File'}
                                            </Button>
                                        </Group>
                                    </Stack>
                                </form>
                            </Paper>
                        </Stepper.Step>
                        
                        <Stepper.Step
                            label="Complete"
                            description="Import completed"
                            icon={<IconCheck style={{ width: rem(18), height: rem(18) }} />}
                        >
                            <Paper p="xl" withBorder>
                                <Stack align="center">
                                    <IconCheck size={48} color="green" />
                                    <Title order={3}>Import Completed</Title>
                                    
                                    {importResults.length > 0 && (
                                        <Stack mt="md" style={{ width: '100%' }}>
                                            <Text fw={500}>Import Results:</Text>
                                            
                                            {importResults.map((result, index) => (
                                                <Paper key={index} withBorder p="md">
                                                    <Text fw={500}>{files[index]?.name || `File ${index + 1}`}</Text>
                                                    <Text>Container ID: {result.id}</Text>
                                                    <Text>Status: {result.status}</Text>
                                                    <Text>Processed Rows: {result.processed_rows} of {result.total_rows}</Text>
                                                    
                                                    {result.errors && result.errors.length > 0 && (
                                                        <Alert title="Errors During Import" color="red" mt="md">
                                                            <Stack gap="xs">
                                                                {result.errors.map((error: string, idx: number) => (
                                                                    <Text key={idx} size="sm">{error}</Text>
                                                                ))}
                                                            </Stack>
                                                        </Alert>
                                                    )}
                                                </Paper>
                                            ))}
                                        </Stack>
                                    )}
                                    
                                    <Group justify="center" mt="xl">
                                        <Button onClick={handleReset}>
                                            Import More Files
                                        </Button>
                                    </Group>
                                </Stack>
                            </Paper>
                        </Stepper.Step>
                    </Stepper>
                </Stack>
            </Paper>
        </Stack>
    );
} 