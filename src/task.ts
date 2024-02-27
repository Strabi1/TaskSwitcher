
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export type Breakpoint = {
	path: string,
	line: number,
	enabled: boolean,
	condition: string
}

export type Task = {
	task: string,
	breakPoints: Breakpoint[]
}

export class Tasks {
	jsonPath: string = '';
	tasks: Task[] = [];

	constructor(jsonPath: string) {
		this.jsonPath = jsonPath;
		this.updateTasks();
	}

	getTasks(): Task[] {
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
				vscode.window.showErrorMessage(`Error parsing breakpoints JSON: ${error.message}`);
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
				breakPoints: []
			};

			this.tasks.push(newTask) ;
			this.writeTasksToFile();
		}
	}

	exportBreakPoints(taskName: string, breakPoints: Breakpoint[] | any) {
		const taskIndex = this.tasks.findIndex(task => task.task === taskName);

		if (taskIndex !== -1) 
			this.tasks[taskIndex].breakPoints = breakPoints;


		this.writeTasksToFile();
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
			vscode.window.showErrorMessage(`Error write breakpoints JSON: ${error.message}`);
		}
	}
}
