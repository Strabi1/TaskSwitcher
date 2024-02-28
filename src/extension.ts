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
		vscode.commands.registerCommand('taskswitcher.exportBreakpoints', async() => {
			const selectedTask = await selectTask('Choose a task');
	
			if (selectedTask) {
				const breakpoints = vscode.debug.breakpoints;
				const breakpointsData = breakpoints.map(bp => {
					if (bp instanceof vscode.SourceBreakpoint) {
					
						const breakpoint: tasks.Breakpoint = {
							path: bp.location.uri.fsPath,
							line: bp.location.range.start.line,
							enabled: bp.enabled,
							condition: bp.condition ? bp.condition : ''
						};

						return breakpoint;
					} 
				}).filter(Boolean);

				myTasks.exportBreakPoints(selectedTask, breakpointsData);
			}
		}),
		
		// =========================================
		// Import breakpoints
		// =========================================
		vscode.commands.registerCommand('taskswitcher.importBreakpoints', async() => {
			const selectedTask = await selectTask('Choose a task');
	
			if (selectedTask) {
				const breakp = myTasks.importBreakPoint(selectedTask);

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
		// Export editors
		// =========================================
		vscode.commands.registerCommand('taskswitcher.exportEditors', async() => {
			const selectedTask = await selectTask('Choose a task');
	
			if (selectedTask) {
				const editorGroups = vscode.window.tabGroups.all;
	
				const editorLayout = editorGroups.map(group => {
					return {
						viewColumn: group.viewColumn,
						editors: group.tabs.map(tab => {
							
							const inputUri = (tab.input as any)?.uri?.toString();
							const editor: tasks.Editor = {
								label: tab.label,
								resource: inputUri,
								isPreview: tab.isPreview
							};

							return editor;
						})
					};
				});

				myTasks.exportEditors(selectedTask, editorLayout);
			}
		}),

		// =========================================
		// Import editors
		// =========================================
		vscode.commands.registerCommand('taskswitcher.importEditors', async() => {
			const selectedTask = await selectTask('Choose a task');
	
			if (selectedTask) {
				const editors = myTasks.importEditors(selectedTask);
				await vscode.commands.executeCommand('workbench.action.closeAllEditors');
				const editorGroups = myTasks.importEditors(selectedTask);

				if(editorGroups) {
					for (const group of editorGroups) {
						for (const editor of group.editors) {
							if (editor.resource) {
								const document = await vscode.workspace.openTextDocument(vscode.Uri.parse(editor.resource));
								await vscode.window.showTextDocument(document, { preview: editor.isPreview, viewColumn: group.viewColumn });
							}
						}
					}
				}
			}
		}),
		
		// =========================================
		// Create new task
		// =========================================
		vscode.commands.registerCommand('taskswitcher.createNewTask', async() => {
			const userInput = await vscode.window.showInputBox({
				prompt: 'Enter the name of the task!',
				placeHolder: 'Task name'
			});
			
			if (userInput)
			myTasks.createNewTask(userInput);
		}),

		// =========================================
		// Delete task
		// =========================================
		vscode.commands.registerCommand('taskswitcher.deleteTask', async() => {
			const selectedTask = await selectTask('Task to be deleted');
			
			if (selectedTask) {
				const result = await vscode.window.showInformationMessage(
					'Are you sure you want to delete task?', { modal: true }, 'Yes');
					
					if (result === 'Yes')
						myTasks.deleteTask(selectedTask);
			}
		})
	);

	async function selectTask(placeHolder: string): Promise<tasks.Task | undefined> {
		const allTask = myTasks.getTasks();
		const picks = allTask.map(task => ({ label: task.task }));

		const selectedTask = await vscode.window.showQuickPick(picks, {
			placeHolder: placeHolder,
		});

		if(selectedTask)
			return allTask.find(task => task.task === selectedTask.label);

		return undefined;
	}

}


export function deactivate() {}
