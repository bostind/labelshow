document.addEventListener('DOMContentLoaded', () => {
    const contentDisplay = document.getElementById('content-display');
    const namespaceSelect = document.getElementById('namespace-select');
    const deploymentSelect = document.getElementById('deployment-select');

    // 从服务器获取命名空间的函数
    function fetchNamespaces() {
        fetch('/api/namespaces') // 从 server.js 提供的 API 获取命名空间内容
            .then(response => {
                if (!response.ok) {
                    throw new Error('网络响应不是 OK');
                }
                return response.json();
            })
            .then(data => {
                // 填充命名空间选择框
                const namespaceSelect = document.getElementById('namespace-select');
                namespaceSelect.innerHTML = ''; // 清空之前的选项
    
                data.forEach(namespace => {
                    const div = document.createElement('div'); // 创建div元素
                    div.innerHTML = ''; // 清空之前的内容
                    div.className = 'namespace';
                    div.setAttribute('data-value', namespace.namespace); // 设置自定义属性为命名空间名称
                    div.textContent = namespace.namespace; // 显示命名空间名称
                    
                    div.addEventListener("click", function() {
                        const selectedNamespace = div.getAttribute('data-value'); // 获取当前选中的命名空间
                        const progressBar = document.querySelector('.progress-bar');
                        progressBar.classList.remove('hidden'); // 显示动画
                        document.querySelectorAll('.namespace').forEach(namespace => {
                            namespace.classList.remove('selected');
                        });
                        this.classList.add('selected'); // 给当前选中项添加 selected 类
                        fetch('/run-pod-script', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json' // 设置请求头
                            },
                            body: JSON.stringify({ namespace: selectedNamespace }) // 将选中的命名空间作为字符串参数传递
                        })
                        .then(response => response.json())
                        .then(data => {
                            console.log("脚本执行结果:", data);
                            fetchContent(selectedNamespace); // 重新获取内容并更新显示
                            clearInterval(window.progressInterval);   
                            progressBar.classList.add('hidden'); // 隐藏动画   
                        })
                        .catch((error) => {
                            console.error("发生错误:", error);
                        });
                    });
    
                    namespaceSelect.appendChild(div); // 添加到容器中
                });
    
                fetchContent(namespaceSelect.value); // 默认获取选中的命名空间内容
            })
            .catch(error => console.error('错误:', error));
    }

    // 获取 Pods 内容并展示
    function fetchContent(namespace) {
        let url = `/api/pods?namespace=${namespace}`;
        fetch(url) // 传递选择的命名空间
            .then(response => {
                if (!response.ok) {
                    throw new Error('网络响应不是 OK');
                }
                return response.json();
            })
            .then(data => {
                // 清空之前的内容
                contentDisplay.innerHTML = '';
                deploymentSelect.innerHTML = ''; // 清空部署下拉框

                const deployments = new Set(); // 存储该命名空间下的 Deployments

                // 遍历 Pods 数据
                Object.keys(data).forEach(region => {
                    const regionDiv = document.createElement('div');
                    regionDiv.className = 'region-container';
                  
                    const regionName = document.createElement('h1');
                    regionName.className = 'region-name'; // 设置 region名称的类
                    regionName.textContent = region; // 设置 region 名称的文本内容
                    const zones = data[region];
                    regionDiv.appendChild(regionName);

                    Object.keys(zones).forEach(zone => {
                        const zoneDiv = document.createElement('div');
                        zoneDiv.className = 'zone-container';
                        
                        const zoneName = document.createElement('h2');
                              zoneName.className = 'zone-name'; // 设置 zone 名称的类
                              zoneName.textContent = zone; // 设置 zone 名称的文本内容

                              // 将 zone 名称元素添加到 zoneDiv 中
                              zoneDiv.appendChild(zoneName);

                        const racks = zones[zone];
                        Object.keys(racks).forEach(rack => {
                            const rackDiv = document.createElement('div');
                            rackDiv.className = 'rack-container';
                            rackDiv.innerHTML = `<h4>${rack}</h4>`;

                            const hosts = racks[rack];
                            Object.keys(hosts).forEach(hostname => {
                                const pods = hosts[hostname];

                                // 创建一个框线显示 hostname
                                const hostnameDiv = document.createElement('div');
                                hostnameDiv.className = 'pod_hostname-container';
                                hostnameDiv.innerHTML = `<strong>${hostname}</strong>`; // 显示 hostname

                                pods.forEach(pod => {
                                    const podDiv = document.createElement('div');
                                    podDiv.className = 'pod-container'; // 添加对应的样式
                                    podDiv.textContent = pod.pod_name; // 只显示 pod_name
                                    hostnameDiv.appendChild(podDiv); // 将 pod 放入 hostname 的框中

                                    // 存储 Deployment 名称
                                  deployments.add(pod.deployment_name);

                                });
                                

                                rackDiv.appendChild(hostnameDiv); // 将 hostname 的框添加到机架 div 中
                            });

                            zoneDiv.appendChild(rackDiv); // 添加 rack 到 zone
                        });

                        regionDiv.appendChild(zoneDiv); // 添加 zone 到 region
                    });

                    contentDisplay.appendChild(regionDiv); // 添加 region 到页面
                });

                // 填充 Deployment 选择框
                deployments.forEach(deployment => {
                    const div = document.createElement('div');
                    div.className = 'deployment';
                    div.value = deployment; // 设置值为 Deployment 名称
                    div.textContent = deployment; // 显示 Deployment 名称
                    div.dataset.value = deployment;
                  
                    div.addEventListener('click', function() {
                        selectedDeployment = this.getAttribute('data-value'); {

        fetchPodsData(namespaceSelect.value, selectedDeployment); // 根据选择刷新内容，传递命名空间和 Deployment
                 };
                 document.querySelectorAll('.deployment').forEach(deployment => {
                    deployment.classList.remove('selected');
                });
                this.classList.add('selected'); // 给当前选中项添加 selected 类
                });
                deploymentSelect.appendChild(div);
                });
            })
            .catch(error => console.error('错误:', error));
    }

    function fetchPodsData(namespace, selectedDeployment = '') {
        const url = `/api/pods?namespace=${namespace}`; // 构造 URL
        fetch(url) // 从服务器获取数据
            .then(response => {
                if (!response.ok) {
                    throw new Error('网络响应不是 OK');
                }
                return response.json();
            })
            .then(data => {
                contentDisplay.innerHTML = ''; // 清空之前的内容
                
                // 筛选和展示 Pods
                Object.keys(data).forEach(region => {
                    const regionDiv = document.createElement('div');
                    regionDiv.className = 'region-container';
                    //regionDiv.innerHTML = `<h1>${region}</h1>`;
                    const regionName = document.createElement('h1');
                    regionName.className = 'region-name'; // 设置 region名称的类
                    regionName.textContent = region; // 设置 region 名称的文本内容
                    regionDiv.appendChild(regionName);

                    const zones = data[region];
                    Object.keys(zones).forEach(zone => {
                        const zoneDiv = document.createElement('div');
                        zoneDiv.className = 'zone-container';
                       
                        const zoneName = document.createElement('h2');
                              zoneName.className = 'zone-name'; // 设置 zone 名称的类
                              zoneName.textContent = zone; // 设置 zone 名称的文本内容

                              // 将 zone 名称元素添加到 zoneDiv 中
                              zoneDiv.appendChild(zoneName);

                        const racks = zones[zone];
                        Object.keys(racks).forEach(rack => {
                            const rackDiv = document.createElement('div');
                            rackDiv.className = 'rack-container';
                            rackDiv.innerHTML = `<h4>${rack}</h4>`;

                            const hosts = racks[rack];
                            Object.keys(hosts).forEach(hostname => {
                                const pods = hosts[hostname].filter(pod => {
                                    // 筛选出符合当前选择的 Deployment 的 Pods
                                    return selectedDeployment === '' || pod.deployment_name === selectedDeployment;
                                });

                                if (pods.length > 0) {
                                    const hostnameDiv = document.createElement('div');
                                    hostnameDiv.className = 'pod_hostname-container';
                                    hostnameDiv.innerHTML = `<strong>${hostname}</strong>`;
                                    
                                    pods.forEach(pod => {
                                        const podDiv = document.createElement('div');
                                        podDiv.className = 'pod-container';
                                        podDiv.textContent = pod.pod_name; // 只显示 pod_name
                                        hostnameDiv.appendChild(podDiv);
                                    });

                                    rackDiv.appendChild(hostnameDiv); // 将 hostname 添加到机架 div 中
                                }
                            });

                            zoneDiv.appendChild(rackDiv); // 添加 rack 到 zone 中
                        });

                        regionDiv.appendChild(zoneDiv); // 添加 zone 到 region 中
                    });

                    contentDisplay.appendChild(regionDiv); // 添加 region 到页面中
                });
            })
            .catch(error => console.error('错误:', error));
    }

    // 初始加载命名空间
    fetchNamespaces();

    // 刷新按钮处理
    document.getElementById('run-namespace-script').addEventListener('click', function() {
        const progressBar = document.querySelector('.progress-bar');
        progressBar.classList.remove('hidden'); // 显示动画
        fetch('/run-namespace-script', {
            method: 'POST',
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('执行脚本失败');
            }
            return response.json();
        })
        .then(() => {
            // 脚本执行成功后，获取 namespaces_content.json
            return fetch('/api/namespaces');
            
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('获取数据失败');
            }
            return response.json();
        })
        .then(data => {
            // 调用专门的函数来更新下拉列表
            fetchNamespaces(data);
            
            const progressBar = document.querySelector('.progress-bar');
            progressBar.classList.add('hidden'); // 隐藏动画 
        })
        .catch(error => {
            console.error('错误:', error);
        });
        
        
    });
    // 选择命名空间后重新加载 Pods 数据
    namespaceSelect.addEventListener('change', () => {
        fetchContent(namespaceSelect.value); // 根据选择刷新内容
    });

    
});
