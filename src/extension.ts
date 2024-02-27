import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as tasks from './task'

export function activate(context: vscode.ExtensionContext) {

	// =========================================
	// Check and create .vscode folder
	// =========================================
	let vsCodeFolder = "";

	try {
		vsCodeFolder = path.join(vscode.workspace.workspaceFolders![0].uri.fsPath, '.vscode');

		if(!fs.existsSync(vsCodeFolder)) {
			try { fs.mkdirSync(vsCodeFolder); }
			catch {vscode.window.showErrorMessage(".vscode floder create error!"); return; }
		}
 
	} catch { vscode.window.showErrorMessage('No workspace is open! Please open a workspace or folder!'); return; }

	const bpFile = path.join(vsCodeFolder, 'myTasks.json');
	const myTasks = new tasks.Tasks(bpFile);

	context.subscriptions.push(
		// =========================================
		// Export breakpoints
		// =========================================
		vscode.commands.registerCommand('extension.exportBreakpoints', async() => {
			const picks = myTasks.getTasks().map(task => ({ label: task.task }));

			const selected = await vscode.window.showQuickPick(picks, {
				placeHolder: 'Choose a task',
			});
	
			if (selected) {
				const breakpoints = vscode.debug.breakpoints;
				const breakpointsData = breakpoints.map(bp => {
					if (bp instanceof vscode.SourceBreakpoint) {
					
						let breakpoint: tasks.Breakpoint = {
							path: bp.location.uri.fsPath,
							line: bp.location.range.start.line,
							enabled: bp.enabled,
							condition: bp.condition ? bp.condition : ''
						};

						return breakpoint;
						
					} 
				}).filter(Boolean);

				myTasks.exportBreakPoints(selected.label, breakpointsData) 
			}
		}),
		
		// =========================================
		// Import breakpoints
		// =========================================
		vscode.commands.registerCommand('extension.importBreakpoints', async () => {
			const picks = myTasks.getTasks().map(task => ({ label: task.task }));

			const selected = await vscode.window.showQuickPick(picks, {
				placeHolder: 'Choose a task',
			});
	
			if (selected) {
				const breakp = myTasks.importBreakPoint(selected.label);

				const breakpoints = breakp?.map((bp: any) => {
					return new vscode.SourceBreakpoint(new vscode.Location(vscode.Uri.file(bp.path), new vscode.Position(bp.line, 0)), bp.enabled);
				});
				
				if(breakpoints) {
					vscode.debug.removeBreakpoints(vscode.debug.breakpoints);
					vscode.debug.addBreakpoints(breakpoints);
					vscode.window.showInformationMessage('Breakpoints imported successfully.');
				}
			}
		}),
		
		// =========================================
		// Create new task
		// =========================================
		vscode.commands.registerCommand('extension.createNewTask', async () => {
			const userInput = await vscode.window.showInputBox({
				prompt: 'Enter the name of the task!',
				placeHolder: 'Task name'
			});

			if (userInput)
				myTasks.createNewTask(userInput);
		})
	);
}

export function deactivate() {}
