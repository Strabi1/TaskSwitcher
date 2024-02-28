
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export type Breakpoint = {
	path: string,
	line: number,
	enabled: boolean,
	condition: string
}

export type Editor = {
	label: string,
	resource: string,
	isPreview: boolean
}

export type EditorGroups = {
	viewColumn: number,
	editors: Editor[]
}

export type Task = {
	task: string,
	breakPoints: Breakpoint[],
	editorGroups: EditorGroups[]
}

export class Tasks {
	jsonPath: string = '';
	tasks: Task[] = [];

	constructor(jsonPath: string) {
		this.jsonPath = jsonPath;
		this.updateTasks();
	}

	getTasks(): Task[] {
		// Reload file in case the file was modified manually
		this.updateTasks();
		return this.tasks;
	}

	updateTasks(): void {
		try { 
			let jsonString = fs.readFileSync(this.jsonPath, 'utf-8');
			let workspacePath = vscode.workspace.workspaceFolders![0].uri.fsPath;

			jsonString = jsonString.replace(/\$\{workspaceFolder\}/g, workspacePath);
			jsonString = path.normalize(jsonString).replace(/\\/g, '/');

			const filteredString = jsonString.split('\n').filter(line => !line.trim().startsWith('//'));
			try {
				this.tasks = JSON.parse(filteredString.join('\n'));
			}
			catch (error: any) {
				vscode.window.showErrorMessage(`Error parsing the JSON file: ${error.message}`);
				this.tasks = [];
			}
		}
		catch (error: any) {
			vscode.window.showErrorMessage(`Error reading the JSON file: ${error.message}`);
			this.tasks = [];
		}
	}

	createNewTask(taskName: string) {
		// Reload file in case the file was modified manually
		this.updateTasks();
		
		if(this.taskExists(taskName)) 
			vscode.window.showInformationMessage(`Project ${taskName} already exists!`);

		else {
			const newTask: Task = {
				task: taskName,
				breakPoints: [],
				editorGroups: []
			};

			this.tasks.push(newTask) ;
			this.writeTasksToFile();
		}
	}

	deleteTask(taskToDelete: Task) {
		this.tasks = this.tasks.filter(task => task.task !== taskToDelete.task);
		this.writeTasksToFile();
	}

	exportBreakPoints(task: Task, breakPoints: Breakpoint[] | any) {
		if(breakPoints) {
			task.breakPoints = breakPoints;
			this.writeTasksToFile();
		}
	}

	importBreakPoint(task: Task): Breakpoint[] | undefined {
		return task.breakPoints;
	}

	exportEditors(task: Task, editorGroups: EditorGroups[] | any) {
		if(editorGroups) {
			task.editorGroups = editorGroups;
			this.writeTasksToFile();
		}
	}

	importEditors(task: Task): EditorGroups[] | undefined {
		return task.editorGroups;
	}

	taskExists(taskName: string): boolean {
		return this.tasks.some(task => task.task === taskName);
	}

	writeTasksToFile(): void {
		try {
			let jsonString = JSON.stringify(this.tasks, null, 4);
			jsonString = path.normalize(jsonString);
			jsonString = jsonString.replace(/\\/g, '/');

			let workspacePath = vscode.workspace.workspaceFolders![0].uri.fsPath;
			workspacePath = path.normalize(workspacePath).replace(/\\/g, '/');
			jsonString = jsonString.replace(new RegExp(workspacePath, 'g'), '${workspaceFolder}');

			fs.writeFileSync(this.jsonPath, jsonString, 'utf-8');
		} catch (error: any) {
			vscode.window.showErrorMessage(`Error write the JSON file: ${error.message}`);
		}
	}
}
